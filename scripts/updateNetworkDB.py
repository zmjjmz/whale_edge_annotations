import lasagne.layers as ll
from lasagne.nonlinearities import linear, softmax, sigmoid, rectify
from lasagne.objectives import binary_crossentropy
from lasagne.updates import adam, nesterov_momentum
from ibeis.web.appfuncs import return_src
from lasagne.init import Orthogonal, Constant
from lasagne.regularization import l2, regularize_network_params
from segmentation_network import preproc_dataset
from train_utils import load_dataset, dataset_loc
import theano.tensor as T
from theano import function as tfn

import cPickle as pickle
import numpy as np
import time
import os
from os.path import join
import glob
import cv2
from scipy.stats import entropy
from pymongo import MongoClient

import ibeis

class Softmax4D(ll.Layer):
	def get_output_for(self, input, **kwargs):
		si = input.reshape((input.shape[0], input.shape[1], -1))
		shp = (si.shape[0], 1, si.shape[2])
		exp = T.exp(si - si.max(axis=1).reshape(shp))
		softmax_expression = (exp / (exp.sum(axis=1).reshape(shp) + 1e-7) ).reshape(input.shape)
		return softmax_expression

def build_segmenter_vgg():
    	vgg_net = build_vgg16_seg()
    	conv3 = ll.Conv2DLayer(vgg_net['conv4_3'], num_filters=128, filter_size=(3,3), pad='same', W=Orthogonal(), nonlinearity=rectify, name='conv3')
    	conv4 = ll.Conv2DLayer(conv3, num_filters=64, filter_size=(3,3), pad='same', W=Orthogonal(), nonlinearity=rectify, name='conv4')
    	conv_final = ll.Conv2DLayer(conv4, num_filters=3, filter_size=(3,3), pad='same', W=Orthogonal(), name='conv_final', nonlinearity=linear)
    	softmax = Softmax4D(conv_final, name='4dsoftmax')
    	return softmax

def build_vgg16_seg():
    	net = {}
    	net['input'] = ll.InputLayer((None, 3, None, None), name='inp')
    	net['conv1_1'] = ll.Conv2DLayer(net['input'], 64, 3, pad='same', name='conv1')
    	net['drop1'] = ll.DropoutLayer(net['conv1_1'], p=0.5)
    	net['conv1_2'] = ll.Conv2DLayer(net['drop1'], 64, 3, pad='same', name='conv2')
   	net['conv2_1'] = ll.Conv2DLayer(net['conv1_2'], 128, 3, pad='same')
	net['drop2'] = ll.DropoutLayer(net['conv2_1'], p=0.5)
   	net['conv2_2'] = ll.Conv2DLayer(net['drop2'], 128, 3, pad='same')
   	net['conv3_1'] = ll.Conv2DLayer(net['conv2_2'], 256, 3, pad='same')
   	net['drop3'] = ll.DropoutLayer(net['conv3_1'], p=0.5)
   	net['conv3_2'] = ll.Conv2DLayer(net['drop3'], 256, 3, pad='same')
    	net['conv3_3'] = ll.Conv2DLayer(net['conv3_2'], 256, 3, pad='same')
    	net['drop4'] = ll.DropoutLayer(net['conv3_3'], p=0.5)
    	net['conv4_1'] = ll.Conv2DLayer(net['drop4'], 512, 3, pad='same')
    	net['conv4_2'] = ll.Conv2DLayer(net['conv4_1'], 512, 3, pad='same')
    	net['drop5'] = ll.DropoutLayer(net['conv4_2'], p=0.5)
    	net['conv4_3'] = ll.Conv2DLayer(net['drop5'], 512, 3, pad='same')
    	net['conv5_1'] = ll.Conv2DLayer(net['conv4_3'], 512, 3, pad='same')
    	net['conv5_2'] = ll.Conv2DLayer(net['conv5_1'], 512, 3, pad='same')
    	net['conv5_3'] = ll.Conv2DLayer(net['conv5_2'], 512, 3, pad='same')

	return net

def prepare_img(img):
	img_normed = ((img - test_dset['mean']) / test_dset['std']).swapaxes(0,2).astype(np.float32)
	img_normed = img_normed.reshape(1, *img_normed.shape)
	return img_normed

def runImage(gid,ibs,network_fn):	
	imageLocations = "/home/zach/data/Flukes/CRC_combined constrained/"
	name = imageLocations+ibs.get_image_gnames(gid)
	img = cv2.imread(name)
	img_normed = prepare_img(img)
	img_output = network_fn(img_normed)

	img_output = img_output.swapaxes(1,3)[0]
	args = np.argmax(img_output, axis=2)
	background_mask = args == 2
	whale_mask = args == 1
	seam_mask = args == 0
         
        img_output[:,:][background_mask] = [255,0,0]
        img_output[:,:][whale_mask] = [0,255,255]
        img_output[:,:][seam_mask] = [255,0,255]
	
	gradientImg = np.copy(img_output)
        gradientImg[:,:][background_mask] = 255
        gradientImg[:,:][whale_mask] = 0
        gradientImg[:,:][seam_mask] = 255
        gradientImg = gradientImg.astype(np.uint8)
        gradientvalue = float(np.absolute(np.average(cv2.Laplacian(gradientImg,cv2.CV_64F))))
	
        entrpy = entropy(img_output.swapaxes(0,2))
        entrpy = np.average(entrpy)
        
        bins = []
        bins.append(np.sum(background_mask))
        bins.append(np.sum(whale_mask))
        bins.append(np.sum(seam_mask))   
   
        cv2.imwrite('tmp.png',img_output)
        src = return_src('tmp.png')
	return {'bins':bins,'gid':gid,'png':src,'version':nextVersion,'entropy':float(entrpy),'gradient':gradientvalue} 


def getVersion():
	f = open('networkVersion.txt', 'r')
        val = f.read()
        f.close()
        return int(val)
    
def updateVersion(nextVersion):
    	f = open('networkVersion.txt', 'w')
    	f.write(str(nextVersion))
    	f.close()  

if __name__ == '__main__':
	#TODO make file that contains current version number
        nextVersion = getVersion()
	with open(join(dataset_loc, "Flukes/patches/annot_full_64_100r_zs/vgg16_c43_10ep_adam_l21e-3.pkl"), 'r') as f:
		model = pickle.load(f)
	test_dset = load_dataset(join(dataset_loc, "Flukes/patches/TESTannot_full_64_100r_zs")) 
	segmenter = build_segmenter_vgg()
	ll.set_all_param_values(segmenter, model)
	X = T.tensor4()
	segmenter_out = ll.get_output(segmenter, X)
	segmenter_fn = tfn([X], segmenter_out)
	dset_for_model = {section:preproc_dataset(test_dset[section]) for section in ['train', 'valid', 'test']}
	segmentation_outputs = segmenter_fn(dset_for_model['train']['X'])
	segmentation_outputs_valid = segmenter_fn(dset_for_model['valid']['X'])
	usedGids = []

        #open MongoDB
	c = MongoClient()
	db = c['annotationInfo']
	collection = db['networkResults']
	cursor = collection.find({'version':nextVersion})
	values = cursor[:]
	for value in values:
		usedGids.append(value['gid'])
	
	ibs = ibeis.opendb(dbdir='/home/zach/data/IBEIS/humpbacks')
	gid_list = ibs.get_valid_gids()
	print 'Number of Previous images ' + str(len(usedGids))
        count = 0
	
	for gid in gid_list:
		if(gid in usedGids):
			continue
		count += 1
		print count
		value = runImage(gid,ibs,segmenter_fn)
		collection.update_one({'gid':gid},{'$set':value},upsert=True)
	os.remove('tmp.png')
	updateVersion(nextVersion+1)
