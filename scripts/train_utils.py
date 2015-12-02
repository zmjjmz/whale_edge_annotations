from __future__ import division
from itertools import chain, product
import random
import cv2
from os.path import join, exists
from os import mkdir
import cPickle as pickle

from ibeis_cnn.draw_net import imwrite_architecture
import theano.tensor as T
from theano import function as tfunc
import lasagne.layers as ll
from lasagne.init import Constant
from lasagne.nonlinearities import softmax
import numpy as np
import time
from sklearn.utils import shuffle
import scipy.sparse as ss

with open('../dataset_loc','r') as f:
    dataset_loc = f.read().rstrip()

class ResponseNormalizationLayer(ll.Layer):
    def get_output_for(self, input, **kwargs):
        return (input / (T.sqrt((input**2).sum(axis=1)).reshape((-1,1))))


def make_identity_transform():
    # returns b and W for identity transform
    b = np.zeros((2,3),dtype=np.float32)
    b[0,0] = 1
    b[1,1] = 1
    b = b.flatten()
    W = Constant(0.0)
    return W, b

def argmax_classes(classes, nclasses=None):
    # assume classes is a ndarray of int32
    if nclasses is None:
        nclasses = np.max(classes) + 1
    classes_sparse = np.zeros((classes.shape[0], nclasses), dtype=np.float32)
    classes_sparse[zip(*enumerate(classes))] = 1
    return classes_sparse




def desc_func(desc_layer, save_diagram=True):
    # takes a layer and makes a function that returns its output
    # also saves a diagram of the network wrt the descriptor output
    X = T.tensor4()
    if save_diagram:
      all_layers = ll.get_all_layers(desc_layer)
      imwrite_architecture(all_layers, './desc_function.png')
    descriptor = ll.get_output(desc_layer, X, deterministic=True)
    return tfunc([X], descriptor)

def get_img_norm_consts(imgbatch, grey=False):
    if grey:
        mean = np.average(imgbatch)
        std = np.std(imgbatch)
    else:
        mean = np.average(imgbatch, axis=tuple(range(len(imgbatch.shape))[:-1]))
        std = np.std(imgbatch, axis=tuple(range(len(imgbatch.shape))[:-1]))
    return mean, std

def normalize_patch(patch, mean=128, std=128):
    # default to scaling between -1, 1
    return (patch.astype(np.float32) - mean) / (std)


def normalize_patches(patchset):
    new_patchset = {}
    for patch in patchset:
        # zscore normalize
        #new_patchset[patch] = (patchset[patch] - np.mean(patchset[patch],axis=(0,1))) / np.std(patchset[patch],axis=(0,1))
        # assume that our dataset-wide avg is 128, and the std is 255
        new_patchset[patch] = normalize_patch(patchset[patch])
    return new_patchset

def normalize_image_pairs(img_pairlist):
    img_pairs = []
    for imgset1, imgset2 in img_pairlist:
        img_pairs.append((normalize_patches(imgset1),
                          normalize_patches(imgset2)))
    return img_pairs

def normalize_image_idmap(idmap):
    new_idmap = {}
    for indv in idmap:
        new_idmap[indv] = []
        for img in idmap[indv]:
            new_idmap[indv].append(normalize_patches(img))
    return new_idmap

def sparsify(data, threshold=0.6):
    if np.count_nonzero(data) / float(data.flatten().shape[0]) > threshold:
        original_shape = data.shape
        if len(data.shape) > 2:
            # ugh
            data = data.flatten()
        return (ss.coo_matrix(data), original_shape)
    else:
        return data

def desparsify(data):
    if isinstance(data, tuple):
        # this is definitely sparse in the very limited case that this code is meant to be used
        original_shape = data[1]
        datum = data[0]
        return datum.todense().reshape(original_shape)
    else:
        return data


def load_dataset(dataset_path, normalize_method='zscore'):
    print("Loading %s" % dataset_path)
    tic = time.time()
    dset = {}
    with open(join(dataset_path, 'meanstd.pkl'), 'r') as f:
        mean, std = pickle.load(f)
        dset['mean'] = mean
        dset['std'] = std
    if normalize_method == 'zscore':
        normalize = lambda x: (normalize_patch(x[0], mean=dset['mean'], std=dset['std']), x[1])
    elif normalize_method == 'meansub':
        normalize = lambda x: (x[0].astype(np.float32) - dset['mean'], x[1])
    elif normalize_method is None:
        normalize = lambda x: x
    with open(join(dataset_path, 'train.pkl'),'r') as f:
        dset['train'] = normalize(pickle.load(f))
    with open(join(dataset_path, 'val.pkl'),'r') as f:
        dset['valid'] = normalize(pickle.load(f))
    with open(join(dataset_path, 'test.pkl'),'r') as f:
        dset['test'] = normalize(pickle.load(f))
    toc = time.time() - tic
    print("Took %0.2f seconds" % toc)
    return dset

def save_dataset(dataset_path, train, val, test, load_norm_from=None, norms=None):
    if exists(dataset_path):
        print("Overwriting %s y/n" % dataset_path)
        confirm = raw_input().rstrip()
        if confirm != 'y':
            return
    else:
        mkdir(dataset_path)
    # assume train[0] is the dataset
    # figure out normalization constants
    if (load_norm_from is None) and (norms is None):
        mean, std = get_img_norm_consts(train[0])
    elif norms is not None:
        mean, std = norms
    elif load_norm_from is not None:
        try:
            with open(join(load_norm_from, 'meanstd.pkl'), 'r') as f:
                mean, std = pickle.load(f)
        except IOError:
            print("Couldn't find mean and std in %s" % load_norm_from)
            mean, std = get_img_norm_consts(train[0])

    tic = time.time()
    dset = {}
    with open(join(dataset_path, 'train.pkl'),'w') as f:
        pickle.dump(train,f)
    with open(join(dataset_path, 'val.pkl'),'w') as f:
        pickle.dump(val,f)
    with open(join(dataset_path, 'test.pkl'),'w') as f:
        pickle.dump(test,f)
    with open(join(dataset_path, 'meanstd.pkl'),'w') as f:
        pickle.dump((mean, std),f)
    toc = time.time() - tic
    print("Took %0.2f seconds" % toc)


def load_identifier_eval(dataset_path):
    print("Loading %s for identification evaluation" % dataset_path)
    tic = time.time()
    dset = {}
    with open(join(dataset_path, 'idmap.pkl'), 'r') as f:
        dset['idmap'] = pickle.load(f)
    with open(join(dataset_path, 'train.indv'), 'r') as f:
        dset['train'] = pickle.load(f)
    with open(join(dataset_path, 'val.indv'), 'r') as f:
        dset['val'] = pickle.load(f)
    with open(join(dataset_path, 'test.indv'), 'r') as f:
        dset['test'] = pickle.load(f)
    return dset

def shuffle_dataset(dset):
    shuffled_dset = shuffle(*[dset[key] for key in sorted(dset.keys())])
    new_dset = {key:shuffled_dset[ind] for ind, key in enumerate(sorted(dset.keys()))}
    return new_dset

def check_for_dupes(idmap):
    # for every image, check if there's a duplicate image
    def is_equal(patchset1, patchset2):
        return all([not (np.any(patchset1[p] - patchset2[p])) for p in patchset1])
    for q_indv in idmap:
        # assume that no individuals have two images that are duplicates
        for d_indv in idmap:
            if d_indv == q_indv:
                continue
            for patchset1, patchset2 in product(idmap[q_indv], idmap[d_indv]):
                if is_equal(patchset1, patchset2):
                    print("%s has a duplicate image in %s's imageset" % (q_indv, d_indv))

def train_epoch(iteration_funcs, dataset, batch_size=32, batch_loader=(lambda x, sec: x)):
    nbatch_train = (dataset['train']['y'].shape[0] // batch_size)
    nbatch_valid = (dataset['valid']['y'].shape[0] // batch_size)
    sections = ['X','y','pixelw'] # think of this as an ordering over the args for one of the loss_iter functions
    train_losses = []
    train_reg_losses = []

    train_accs = []
    valid_accs = []

    grad_mags = []
    grad_means = []
    grad_nzs = []
    for batch_ind in range(nbatch_train):
        batch_slice = slice(batch_ind*batch_size, (batch_ind + 1)*batch_size)
        # this takes care of the updates as well
        bloss_grads = iteration_funcs['train'](*[batch_loader(dataset['train'][section][batch_slice], section)
            for section in filter(lambda x: x in dataset['train'], sections)])

        batch_train_loss_reg = bloss_grads.pop(0)
        batch_train_loss = bloss_grads.pop(0)
        batch_train_acc = bloss_grads.pop(0)
        grad_mags.append([np.linalg.norm(grad) for grad in bloss_grads])
        grad_means.append([np.mean(np.abs(grad)) for grad in bloss_grads])
        grad_nzs.append([np.count_nonzero(grad) for grad in bloss_grads])
        train_reg_losses.append(batch_train_loss_reg)
        train_losses.append(batch_train_loss)
        train_accs.append(batch_train_acc)

    avg_grad_mags = np.average(np.array(grad_mags), axis=0)
    avg_grad_means = np.average(np.array(grad_means), axis=0)
    print("Gradient names:\t%s" % iteration_funcs['gradnames'])
    print("Gradient magnitudes:\t%s" % avg_grad_mags)
    print("Gradient means:\t%s" % avg_grad_means)
    print("Gadient nonzeros:\t%s" % grad_nzs[0]) # this shouldn't change
    avg_train_loss = np.mean(train_losses)
    avg_train_reg_loss = np.mean(train_reg_losses)
    avg_train_acc = np.mean(train_accs)

    valid_losses = []
    for batch_ind in range(nbatch_valid):
        batch_slice = slice(batch_ind*batch_size, (batch_ind + 1)*batch_size)
        batch_valid_loss, batch_valid_acc = iteration_funcs['valid'](*[batch_loader(dataset['valid'][section][batch_slice], section)
            for section in filter(lambda x: x in dataset['valid'], sections)])
        valid_losses.append(batch_valid_loss)
        valid_accs.append(batch_valid_acc)

    avg_valid_loss = np.mean(valid_losses)
    avg_valid_acc = np.mean(valid_accs)

    return {'train_loss':avg_train_loss,
            'train_reg_loss':avg_train_reg_loss,
            'valid_loss':avg_valid_loss,
            'train_acc':avg_train_acc,
            'valid_acc':avg_valid_acc,
            'all_train_loss':train_losses}

def load_whole_image(imgs_dir, img, img_shape=None):
    # imgs_dir should be the absolute path
    # loads the image and naively resizes to img_shape
    if img_shape is not None:
        return cv2.resize(cv2.imread(join(imgs_dir, img)), img_shape[::-1])
    else:
        return cv2.imread(join(imgs_dir, img))

def parameter_analysis(layer):
    all_params = ll.get_all_param_values(layer, regularizable=True)
    for param in all_params:
        print(param.shape)
        nneg_w = np.count_nonzero(param < 0) / np.product(param.shape)
        normed_norm = np.linalg.norm(param) / np.product(param.shape)
        print("Number of negative weights: %0.2f" % nneg_w)
        print("Weight norm (normalized by size): %0.10f" % normed_norm)

def build_vgg16_seg():
    net = {}
    net['input'] = ll.InputLayer((None, 3, None, None), name='inp')
    net['conv1_1'] = ll.Conv2DLayer(net['input'], 64, 3, pad='same', name='conv1')
    net['drop1'] = ll.DropoutLayer(net['conv1_1'], p=0.5)
    net['conv1_2'] = ll.Conv2DLayer(net['drop1'], 64, 3, pad='same', name='conv2')
    #net['pool1'] = ll.Pool2DLayer(net['conv1_2'], 2)
    net['conv2_1'] = ll.Conv2DLayer(net['conv1_2'], 128, 3, pad='same')
    net['drop2'] = ll.DropoutLayer(net['conv2_1'], p=0.5)
    net['conv2_2'] = ll.Conv2DLayer(net['drop2'], 128, 3, pad='same')
    #net['pool2'] = ll.Pool2DLayer(net['conv2_2'], 2)
    net['conv3_1'] = ll.Conv2DLayer(net['conv2_2'], 256, 3, pad='same')
    net['drop3'] = ll.DropoutLayer(net['conv3_1'], p=0.5)
    net['conv3_2'] = ll.Conv2DLayer(net['drop3'], 256, 3, pad='same')
    net['conv3_3'] = ll.Conv2DLayer(net['conv3_2'], 256, 3, pad='same')
    net['drop4'] = ll.DropoutLayer(net['conv3_3'], p=0.5)
    #net['pool3'] = ll.Pool2DLayer(net['conv3_3'], 2)
    net['conv4_1'] = ll.Conv2DLayer(net['drop4'], 512, 3, pad='same')
    net['conv4_2'] = ll.Conv2DLayer(net['conv4_1'], 512, 3, pad='same')
    net['drop5'] = ll.DropoutLayer(net['conv4_2'], p=0.5)
    net['conv4_3'] = ll.Conv2DLayer(net['drop5'], 512, 3, pad='same')
    #net['pool4'] = ll.Pool2DLayer(net['conv4_3'], 2)
    net['conv5_1'] = ll.Conv2DLayer(net['conv4_3'], 512, 3, pad='same')
    net['conv5_2'] = ll.Conv2DLayer(net['conv5_1'], 512, 3, pad='same')
    net['conv5_3'] = ll.Conv2DLayer(net['conv5_2'], 512, 3, pad='same')
    #net['pool5'] = ll.Pool2DLayer(net['conv5_3'], 2)
    #net['fc6'] = ll.DenseLayer(net['pool5'], num_units=4096)
    #net['fc7'] = ll.DenseLayer(net['fc6'], num_units=4096)
    #net['fc8'] = ll.DenseLayer(net['fc7'], num_units=1000, nonlinearity=None)
    #net['prob'] = ll.NonlinearityLayer(net['fc8'], softmax)

    # load parameters
    param_file = join(dataset_loc, "vgg16.pkl")
    with open(param_file, 'r') as f:
        params = pickle.load(f)

    ll.set_all_param_values(net['conv5_3'], params['param values'][:26])
    return net

def build_vgg16_class():
    net = {}
    net['input'] = ll.InputLayer((None, 3, 224, 224), name='inp')
    net['conv1_1'] = ll.Conv2DLayer(net['input'], 64, 3, pad='same', name='conv1')
    net['drop1'] = ll.DropoutLayer(net['conv1_1'], p=0.5)
    net['conv1_2'] = ll.Conv2DLayer(net['drop1'], 64, 3, pad='same', name='conv2')
    net['pool1'] = ll.Pool2DLayer(net['conv1_2'], 2)
    net['conv2_1'] = ll.Conv2DLayer(net['pool1'], 128, 3, pad='same')
    net['drop2'] = ll.DropoutLayer(net['conv2_1'], p=0.5)
    net['conv2_2'] = ll.Conv2DLayer(net['drop2'], 128, 3, pad='same')
    net['pool2'] = ll.Pool2DLayer(net['conv2_2'], 2)
    net['conv3_1'] = ll.Conv2DLayer(net['pool2'], 256, 3, pad='same')
    net['drop3'] = ll.DropoutLayer(net['conv3_1'], p=0.5)
    net['conv3_2'] = ll.Conv2DLayer(net['drop3'], 256, 3, pad='same')
    net['conv3_3'] = ll.Conv2DLayer(net['conv3_2'], 256, 3, pad='same')
    net['drop4'] = ll.DropoutLayer(net['conv3_3'], p=0.5)
    net['pool3'] = ll.Pool2DLayer(net['drop4'], 2)
    net['conv4_1'] = ll.Conv2DLayer(net['pool3'], 512, 3, pad='same')
    net['conv4_2'] = ll.Conv2DLayer(net['conv4_1'], 512, 3, pad='same')
    net['drop5'] = ll.DropoutLayer(net['conv4_2'], p=0.5)
    net['conv4_3'] = ll.Conv2DLayer(net['drop5'], 512, 3, pad='same')
    net['pool4'] = ll.Pool2DLayer(net['conv4_3'], 2)
    net['conv5_1'] = ll.Conv2DLayer(net['pool4'], 512, 3, pad='same')
    net['conv5_2'] = ll.Conv2DLayer(net['conv5_1'], 512, 3, pad='same')
    net['conv5_3'] = ll.Conv2DLayer(net['conv5_2'], 512, 3, pad='same')
    net['pool5'] = ll.Pool2DLayer(net['conv5_3'], 2)
    net['fc6'] = ll.DenseLayer(net['pool5'], num_units=4096)
    net['fc7'] = ll.DenseLayer(net['fc6'], num_units=4096)
    net['fc8'] = ll.DenseLayer(net['fc7'], num_units=1000, nonlinearity=None)
    net['prob'] = ll.NonlinearityLayer(net['fc8'], nonlinearity=softmax)

    # load parameters
    param_file = join(dataset_loc, "vgg16.pkl")
    with open(param_file, 'r') as f:
        params = pickle.load(f)

    ll.set_all_param_values(net['fc8'], params['param values'])
    return net

def build_vgg16hump_class():
    net = {}
    net['input'] = ll.InputLayer((None, 3, 224, 224), name='inp')
    net['conv1_1'] = ll.Conv2DLayer(net['input'], 64, 3, pad='same', name='conv1')
    net['drop1'] = ll.DropoutLayer(net['conv1_1'], p=0.5)
    net['conv1_2'] = ll.Conv2DLayer(net['drop1'], 64, 3, pad='same', name='conv2')
    net['pool1'] = ll.Pool2DLayer(net['conv1_2'], 2)
    net['conv2_1'] = ll.Conv2DLayer(net['pool1'], 128, 3, pad='same')
    net['drop2'] = ll.DropoutLayer(net['conv2_1'], p=0.5)
    net['conv2_2'] = ll.Conv2DLayer(net['drop2'], 128, 3, pad='same')
    net['pool2'] = ll.Pool2DLayer(net['conv2_2'], 2)
    net['conv3_1'] = ll.Conv2DLayer(net['pool2'], 256, 3, pad='same')
    net['drop3'] = ll.DropoutLayer(net['conv3_1'], p=0.5)
    net['conv3_2'] = ll.Conv2DLayer(net['drop3'], 256, 3, pad='same')
    net['conv3_3'] = ll.Conv2DLayer(net['conv3_2'], 256, 3, pad='same')
    net['drop4'] = ll.DropoutLayer(net['conv3_3'], p=0.5)
    net['pool3'] = ll.Pool2DLayer(net['drop4'], 2)
    net['conv4_1'] = ll.Conv2DLayer(net['pool3'], 512, 3, pad='same')
    net['conv4_2'] = ll.Conv2DLayer(net['conv4_1'], 512, 3, pad='same')
    net['drop5'] = ll.DropoutLayer(net['conv4_2'], p=0.5)
    net['conv4_3'] = ll.Conv2DLayer(net['drop5'], 512, 3, pad='same')
    net['pool4'] = ll.Pool2DLayer(net['conv4_3'], 2)
    net['conv5_1'] = ll.Conv2DLayer(net['pool4'], 512, 3, pad='same')
    net['conv5_2'] = ll.Conv2DLayer(net['conv5_1'], 512, 3, pad='same')
    net['conv5_3'] = ll.Conv2DLayer(net['conv5_2'], 512, 3, pad='same')
    net['pool5'] = ll.Pool2DLayer(net['conv5_3'], 2)
    net['fc6'] = ll.DenseLayer(net['pool5'], num_units=4096)
    net['fc7'] = ll.DenseLayer(net['fc6'], num_units=4096)
    net['fc8'] = ll.DenseLayer(net['fc7'], num_units=1001, nonlinearity=None)
    net['prob'] = ll.NonlinearityLayer(net['fc8'], nonlinearity=softmax)

    return net

def display_losses(losses, n_epochs, batch_size, train_size, fn='losses.png'):
    import matplotlib.pyplot as plt
    ax = plt.subplot()
    batches_per_epoch = train_size // batch_size
    ax.scatter(range(n_epochs*batches_per_epoch), losses['batch'], color='g')
    ax.scatter([i*batches_per_epoch for i in range(n_epochs)], losses['epoch'], color='r', s=10.)
    plt.savefig(fn)



