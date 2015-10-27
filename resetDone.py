import glob
import json

if __name__ == '__main__':
  proceed = raw_input('Enter YES if you are sure you want to reset\n')
  if proceed == "YES":
    files = glob.glob('annotation_info/*.JSON')
    for item in files:
      with open(item) as data_file:
        data = json.load(data_file)
      update = data[1]['done']
      if update:
	data[1]['done'] = False
        values = json.dumps(data)
        tmp = open(item, 'w')
        tmp.write(values)
        tmp.close
