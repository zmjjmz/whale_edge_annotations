from flask import Flask
from flask import render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/image', methods=['GET'])
def  get_next_image():
    return "Enter path to a file here"



if __name__ == '__main__':
    app.run()
