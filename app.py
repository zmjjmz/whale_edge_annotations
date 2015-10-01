from flask import Flask
from flask import render_template
import ibeis
from ibeis.web.appfuncs import  return_src
from random import shuffle
import json

app = Flask(__name__)

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/image')
def get_next_image():
    value = json.dumps({'src':return_src(ibs.get_image_paths(gid_list[index])) , 'gid':gid_list[index] }, separators=(',',':') )
    index += 1
    return str(value)

@app.route('/upload', methods=['POST'])
def upload():
    if request.method == 'POST':
        pass
    return "done"

if __name__ == '__main__':
    app.run(host='0.0.0.0')
