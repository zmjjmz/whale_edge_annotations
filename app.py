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
    if len(gid_list) == 0:
	return jsonify(finallyDone=True)
    while images[gid_list[index]][1]:
	index += 1
	if index == len(gid_list):
	    index = 0
    gid = gid_list[index]
    fileName = 'annotation_info/' + ibs.get_image_gnames(gid) + '.JSON'
    with open(fileName) as data_file:
    	jsonData = json.load(data_file)
    src = return_src(ibs.get_image_paths(gid))
    img = ibs.get_images(gid)
    images[gid_list[index]][1] = True
    index += 1
    if index == len(gid_list):
	index == 0
    return jsonify(image=src,id=gid,dim1=img.shape[0],dim2=img.shape[1],FinallyDone=False,data=jsonData,totalImages=totalImages,imagesLeft=len(gid_list))

@app.route('/path',methods=['POST'])
def storePath():
    global images
    global gid_list
    jsonData = request.get_json()
    gid = int(jsonData['gid'])
    images[gid] = False
    if jsonData['done'] or jsonData['bad']:
	images.pop(gid,None)
	gid_list.remove(gid)
    with open("changes.log",'a') as log:
        log.write("Image Updated: " + ibs.get_image_gnames(gid)+'\n')
    fileName = 'annotation_info/' + ibs.get_image_gnames(gid) + '.JSON'

    values = json.dumps([ibs.get_image_gnames(gid),jsonData])

    tmp = open(fileName, 'w')
    tmp.write(values)
    tmp.close

    return "Submitted"

@app.route('/checkout',methods=['POST'])
def checkout():
    global images
    jsonData = request.get_json()
    gid = int(jsonData['gid'])
    images[gid] = False
    return "Checked out"

@app.route('/gradient/<int:gid>',methods=['GET'])
def getYGradient(gid):
    img = ibs.get_images(gid)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gradient_y_image = -1*cv2.Sobel(img,cv2.CV_64F,0,1,ksize=5)
    gradient_x_image = cv2.Sobel(img,cv2.CV_64F,1,0,ksize=5)
    img = gradient_y_image.tolist()
    img2 = gradient_x_image.tolist()
    return jsonify(gradient=img,gradientX=img2,gid=gid)

if __name__ == '__main__':
    ibs = ibeis.opendb(dbdir='/home/zach/data/IBEIS/humpbacks')
    gid_list = ibs.get_valid_gids()
    totalImages = len(gid_list)
    #initialInit(ibs,gid_list)
    images = {}
    files = glob.glob('annotation_info/*.JSON')
    for gid in gid_list:
        name = ibs.get_image_gnames(gid)[:ibs.get_image_gnames(gid).index('.')]
        for item in files:
	    if(item[item.index('/')+1:item.index('.')] == name):
		with open(item) as data_file:
                	data = json.load(data_file)
        badImage = False
        for keys in data[1]:
                if 'bad' in keys:
                        badImage = data[1]['bad']
	if not data[1]['done'] and not badImage:
                images[gid] = [item,False]
    gid_list = images.keys()
    shuffle(gid_list)
    index = 0


    app.run(host='0.0.0.0')
