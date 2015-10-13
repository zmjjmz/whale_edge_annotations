from __future__ import division, print_function
from flask import Flask, jsonify, render_template, request
import ibeis
from ibeis.web.appfuncs import  return_src
from random import shuffle
import cv2
import numpy as np
import pickle
import os.path
import json
import glob

def initialInit(ibs,gid_list):
    info = open('extracted_zsl_annotations_wsingle.pkl')
    f = pickle.load(info)
    info.close
    for gid in gid_list:
	fileName = 'annotation_info/' + ibs.get_image_gnames(gid) + '.JSON'
	if not os.path.isfile(fileName):
            found = False
            values = ""
	    for element in f:
    		if f[element][0]['fn'] == ibs.get_image_gnames(gid):
		    found = True
                    values = json.dumps([f[element][0]['fn'],{'left':f[element][0]['left'],'notch':f[element][0]['notch'],'right':f[element][0]['right'],'done':False}])
	    if not found:
		values = json.dumps([ibs.get_image_gnames(gid),{'done':False}])
            tmp = open(fileName, 'w')
	    tmp.write(values)
            tmp.close
			

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/image',methods=['POST'])
def get_next_image():
    global index
    global images
    while images[gid_list[index]][1]:
	index += 1
    gid = gid_list[index]
    src = return_src(ibs.get_image_paths(gid))
    img = ibs.get_images(gid)
    images[gid_list[index]][1] = True
    index += 1
    return jsonify(image=src,id=gid,dim1=img.shape[0],dim2=img.shape[1])

@app.route('/path',methods=['POST'])
def find_Path():
    jsonData = request.get_json()
    print( jsonData)
    return "test"

@app.route('/gradient/<int:gid>',methods=['GET'])
def getYGradient(gid):
    img = ibs.get_images(gid)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gradient_y_image = -1*cv2.Sobel(img,cv2.CV_64F,0,1,ksize=5)
    print( gradient_y_image.shape)
    img = gradient_y_image.tolist()
    print( len(img))
    return jsonify(gradient=img)

if __name__ == '__main__':
    ibs = ibeis.opendb(dbdir='/home/zach/data/IBEIS/humpbacks')
    gid_list = ibs.get_valid_gids()
    #initialInit(ibs,gid_list)
    shuffle(gid_list)
    images = {}
    files = glob.glob('annotation_info/*.JSON')
    for gid in gid_list:
        name = ibs.get_image_gnames(gid)[:ibs.get_image_gnames(gid).index('.')]
        for item in files:
	    if(item[item.index('/')+1:item.index('.')] == name):
		with open(item) as data_file:    
                    data = json.load(data_file)
		if not data[1]['done']:
                    images[gid] = [item,False]
    gid_list = images.keys()
    index = 0
    
    app.run(host='0.0.0.0')
