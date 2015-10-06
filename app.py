from __future__ import division, print_function
from flask import Flask, jsonify, render_template, request
import ibeis
from ibeis.web.appfuncs import  return_src
from random import shuffle
import cv2
import numpy as np

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/image',methods=['POST'])
def get_next_image():
    global index
    gid = gid_list[index]
    src = return_src(ibs.get_image_paths(gid))
    img = ibs.get_images(gid)
    index += 1
    return jsonify(image=src,id=gid,dim1=img.shape[0],dim2=img.shape[1])

@app.route('/path',methods=['POST'])
def find_Path():
    jsonData = request.get_json()
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
    new_gid_list = []
    flag_list = [ len(aid_list) > 1 for aid_list in ibs.get_image_aids(gid_list) ]
    for i in range(len(gid_list)):
        if not flag_list[i]:
            new_gid_list.append(gid_list[i])

    gid_list = new_gid_list
    shuffle(gid_list)
    index = 0

    app.run(host='0.0.0.0')
