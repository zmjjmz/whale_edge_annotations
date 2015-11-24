from segmentation_network import build_segmenter, preproc_dataset
from train_utils import load_dataset, dataset_loc
import theano.tensor as T
from theano import function as tfn
import cPickle as pickle
import numpy as np
import time
import lasagne.layers as ll
import os
from os.path import join
import glob
import cv2
from scipy.stats import entropy
import ibeis
from pymongo import MongoClient
from ibeis.web.appfuncs import return_src

def runImage(gid,ibs,network_fn):	
	imageLocations = "/home/zach/data/Flukes/CRC_combined constrained/"
	name = imageLocations+ibs.get_image_gnames(gid)
	img = cv2.imread(name)
	img_normed = ((np.array(img, dtype='float32') - 128) / 255.).swapaxes(0,2)
	img_normed = img_normed.reshape(1, *img_normed.shape)    
	img_output = network_fn(img_normed)

	img_output = img_output.swapaxes(1,3)[0]
	args = np.argmax(img_output, axis=2)
	background_mask = args == 2
	whale_mask = args == 1
	seam_mask = args == 0
         
        img_output[:,:][background_mask] = [255,0,0]
        img_output[:,:][whale_mask] = [0,255,255]
        img_output[:,:][seam_mask] = [255,0,255]

        entrpy = entropy(img_output.swapaxes(0,2))
        entrpy = np.average(entrpy)
        
        bins = []
        bins.append(np.sum(background_mask))
        bins.append(np.sum(whale_mask))
        bins.append(np.sum(seam_mask))   
   
        cv2.imwrite('tmp.png',img_output)
        src = return_src('tmp.png')
	return {'bins':n,'gid':gid,'png':src,'version':nextVersion,'entropy':entrpy} 

if __name__ == '__main__':
        nextVersion = 2
        #TODO make commandline argument for model location
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
		collection.update_one({'gid':value['gid']},{'$set':value},upsert=True)
	os.remove('tmp.png')
