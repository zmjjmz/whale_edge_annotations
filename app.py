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
from pymongo import MongoClient
import operator

'''
Function to initialize Data if missing in data set
'''
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

'''
Endpoint to find similar images
'''
@app.route('/imageSimilar/<int:gid>',methods=['POST'])
def get_similar_image(gid):
    global images
    if len(gid_list) == 0:
        return jsonify(finallyDone=True)
    index = None
    length = len(listCursor)
    #Loop to find location of given gid in sorted list
    for i in range(length):
        if listCursor[i]['gid'] == gid:
            index = i
            break
    closeImages = []
    key = 1
    while len(closeImages) < 10:
        #Looping till an unlabeled image found
        option1 = listCursor[min(index+key,length-1)]
        option2 = listCursor[max(index-key,0)]
        if option1['gid'] in gid_list and not images[option1['gid']][1] and min(index+key,length-1) not in closeImages:
            closeImages.append(min(index+key,length-1))
        if option2['gid'] in gid_list and not images[option2['gid']][1] and max(index-key,0) not in closeImages:
            closeImages.append(max(index-key,0) )
        key += 1

    entropyDistance = [(listCursor[x]['entropy']-listCursor[index]['entropy'])**2 for x in closeImages]
    closest = np.argmin(entropyDistance)
    nextGid = listCursor[closeImages[closest]]['gid']
    images[nextGid][1] = True
    #Opening next file to read info from
    fileName = 'annotation_info/' + ibs.get_image_gnames(nextGid) + '.JSON'
    with open(fileName) as data_file:
        jsonData = json.load(data_file)
    src = return_src(ibs.get_image_paths(nextGid))
    img = ibs.get_images(nextGid)
    return jsonify(image=src,id=nextGid,dim1=img.shape[0],dim2=img.shape[1],FinallyDone=False,data=jsonData,totalImages=totalImages,imagesLeft=len(gid_list))
    
'''
End point to send image data to user
'''
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
    #Opening stored data from JSON file
    fileName = 'annotation_info/' + ibs.get_image_gnames(gid) + '.JSON'
    with open(fileName) as data_file:
    	jsonData = json.load(data_file)
    src = return_src(ibs.get_image_paths(gid))
    img = ibs.get_images(gid)
    images[gid_list[index]][1] = True
    index += 1
    if index == len(gid_list):
	index == 0
    #sending information to client
    return jsonify(image=src,id=gid,dim1=img.shape[0],dim2=img.shape[1],FinallyDone=False,data=jsonData,totalImages=totalImages,imagesLeft=len(gid_list))

'''
Endpoint to store annotations in JSON file
'''
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

'''
Endpoint to return image
'''
@app.route('/checkout',methods=['POST'])
def checkout():
    global images
    jsonData = request.get_json()
    gid = int(jsonData['gid'])
    images.pop(gid,None)
    gid_list.remove(gid)
    return "Checked out"

'''
Endpoint to reterive gradient given gid of image
'''
@app.route('/gradient/<int:gid>',methods=['GET'])
def getYGradient(gid):
    img = ibs.get_images(gid)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gradient_y_image = -1*cv2.Sobel(img,cv2.CV_64F,0,1,ksize=5)
    gradient_x_image = cv2.Sobel(img,cv2.CV_64F,1,0,ksize=5)
    img = gradient_y_image.tolist()
    img2 = gradient_x_image.tolist()
    return jsonify(gradient=img,gradientX=img2,gid=gid)

'''
Endpoint to retreive network result of image
'''
@app.route('/networkResult/<int:gid>',methods=['GET'])
def getNetworkResult(gid):
    imgObj = collection.find({'gid':gid}).next()
    return jsonify(url=imgObj['png'])     

if __name__ == '__main__':
    #Initialize Ibies Database
    ibs = ibeis.opendb(dbdir='/home/zach/data/IBEIS/humpbacks',allow_newdir=False)
    gid_list = ibs.get_valid_gids()

    #Initialize Network Results collection
    c = MongoClient()
    db = c['annotationInfo']
    collection = db['networkResults']
    sorted_cursor = collection.find({ '$query': {},'$orderby': { 'gradient' : -1}},{'gid':1,'entropy':1,'_id':-1})
    listCursor = list(sorted_cursor)

    totalImages = len(gid_list)
    images = {}
    files = glob.glob('annotation_info/*.JSON')
    #Finding item that are marked bad and not labled makred bad
    for gid in gid_list:
        fileName = None
        name = ibs.get_image_gnames(gid)[:ibs.get_image_gnames(gid).index('.')]
        for item in files:
	    if(item[item.index('/')+1:item.index('.')] == name):
                fileName = item
		with open(item) as data_file:
                	data = json.load(data_file)
        badImage = False
        for keys in data[1]:
                if 'bad' in keys:
                        badImage = data[1]['bad']
	if not data[1]['done'] and not badImage:
                images[gid] = [fileName,False]
    gid_list = images.keys()
    shuffle(gid_list)
    index = 0

    app.run(host='0.0.0.0')
