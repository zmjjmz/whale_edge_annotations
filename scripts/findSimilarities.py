from segmentation_network import build_segmenter, preproc_dataset
from train_utils import load_dataset, dataset_loc
import theano.tensor as T
from theano import function as tfn
import cPickle as pickle
import numpy as np
import time
import lasagne.layers as ll
from os.path import join
import glob
import random
import cv2
from io import BytesIO
import base64
from scipy.stats import entropy
import matplotlib.pyplot as plt
import ibeis
import gc
import string
from pymongo import MongoClient

def runImage(gid,ibs,network_fn):	
	imageLocations = "/home/zach/data/Flukes/CRC_combined constrained/"
	name = imageLocations+ibs.get_image_gnames(gid)
	img = cv2.imread(name)
	img_normed = np.array((img - 128) / 255., dtype='float32').swapaxes(0,2)
	img_normed = img_normed.reshape(1, *img_normed.shape)    
	img_output = network_fn(img_normed)

	img_output = img_output.swapaxes(1,3)[0]
	args = np.argmax(img_output, axis=2)
	background_mask = args == 2
	whale_mask = args == 1
	seam_mask = args == 0
    
	img_output[:,:][background_mask] = [0,0,1]
	img_output[:,:][whale_mask] = [1,1,0]
	img_output[:,:][seam_mask] = [1,0,1]
    
	plt.imshow(img_output)
	figfile = BytesIO()
	plt.savefig(figfile, format='png')
	figfile.seek(0)  # rewind to beginning of file
	figdata_png = 'data:image/png;base64,'+base64.b64encode(figfile.getvalue())
  	n, bins, patches = plt.hist(args.flatten(),3)
	args = n
	return {'bins':n,'gid':gid,'png':figdata_png} 

if __name__ == '__main__':
	with open(join(dataset_loc, "Flukes/patches/annot_path_32/model.pkl"), 'r') as f:
		model = pickle.load(f)
	test_dset = load_dataset(join(dataset_loc, "Flukes/patches/TESTannot_path_32"))	
	
	segmenter = build_segmenter()
	ll.set_all_param_values(segmenter, model)
	X = T.tensor4()
	segmenter_out = ll.get_output(segmenter, X)
	segmenter_fn = tfn([X], segmenter_out)
	dset_for_model = {section:preproc_dataset(test_dset[section]) for section in test_dset}
	segmentation_outputs = segmenter_fn(dset_for_model['train']['X'])
	segmentation_outputs_valid = segmenter_fn(dset_for_model['valid']['X'])
	usedGids = []
	c = MongoClient()
	db = c['annotationInfo']
	collection = db['networkResults']
	cursor = collection.find({})
	values = cursor[:]
	for value in values:
		usedGids.append(value['gid'])
	
	ibs = ibeis.opendb(dbdir='/home/zach/data/IBEIS/humpbacks')
	gid_list = ibs.get_valid_gids()

        count = 0
	for gid in gid_list:
		if(gid in usedGids):
			continue
		count += 1
		print count
		value = runImage(gid,ibs,segmenter_fn)
		value['bins'] = value['bins'].tolist()
		collection.insert(value)
	
