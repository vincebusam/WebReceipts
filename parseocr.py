#!/usr/bin/python
import os
import sys
import json
from lxml import etree
import dateutil.parser
from AbbyyOnlineSdk import *  

def getconfig(cfg):
    return [x.strip() for x in open((os.path.dirname(__file__) or ".")+"/config.txt") if x.startswith(cfg)][0].split("=")[1]

processor = AbbyyOnlineSdk()
processor.ApplicationId = os.getenv("ABBYY_APPID") or getconfig("ABBYY_APPID")
processor.Password = os.getenv("ABBYY_PWD") or getconfig("ABBYY_PWD")

class OCR:
    def __init__(self, imageid):
        self.runocr(imageid)
        self.lines = self.process(etree.parse(open(imageid + ".xml")).getroot())

    def runocr(self, imageid):
        if os.path.exists(imageid + ".xml"):
            return
	settings = ProcessingSettings()
	settings.Language = "English"
	settings.OutputFormat = "xml"
	settings.ImageSource = "photo"
	settings.profile = "textExtraction"
	task = processor.ProcessImage(imageid+".jpg", settings)
	if task == None:
		return

	# Wait for the task to be completed
	while True :
		task = processor.GetTaskStatus(task)
		if task.IsActive() == False:
			break
		time.sleep(1)

	if task.DownloadUrl != None:
		processor.DownloadResult(task, imageid+".xml")

    def process(self, e, ret=[]):
        if e.tag.endswith("line"):
            curline = e.items()
            curline.append(("text", "".join([x.text for x in e[0]])))
            d = dict(curline)
            for c in ['t','l','b','r']:
                d[c] = int(d[c])
            ret.append(d)
            return d
        [self.process(x,ret) for x in e]
        return ret

    def maxbounds(self):
        ret = {'l': sys.maxint, 't': sys.maxint, 'r': 0, 'b': 0}
        for line in self.lines:
            ret['l'] = min(ret['l'],line['l']-5)
            ret['t'] = min(ret['t'],line['t']-5)
            ret['r'] = max(ret['r'],line['r']+5)
            ret['b'] = max(ret['b'],line['b']+5)
        return ret

    def expandbox(self, old, new):
        if not old:
            return new
        old["text"] += " " + new["text"]
        old['l'] = min(old['l'],new['l'])
        old['t'] = min(old['t'],new['t'])
        old['r'] = max(old['r'],new['r'])
        old['b'] = max(old['b'],new['b'])
        return old

    def guess(self):
        ret = {
            "title": self.lines[0]["text"],
            "titlebox": self.lines[0]
        }

        dateline = ""
        ret["datebox"] = None
        for line in self.lines:
            if line["text"].replace(".","").isdigit():
                continue
            try:
                date = dateutil.parser.parse(line["text"])
                dateline += line["text"] + " "
                ret["date"] = dateutil.parser.parse(dateline).date()
                ret["datebox"] = self.expandbox(ret["datebox"],line)
            except ValueError:
                pass

        totalline = None
        for line in self.lines:
            if "total" in line["text"].lower() or "amount due" in line["text"].lower():
                totalline = line
                ret["totalbox"] = line
                digits = "".join([x for x in line["text"] if not x.isalpha()])
                if digits:
                    try:
                        ret["total"] = int(float(digits.replace(" ","").replace("$",""))*100)
                    except:
                        pass
                if "".join([x for x in line["text"] if x.isalpha()]).lower() == "total":
                    break

        if totalline and "total" not in ret:
            for line in self.lines:
                if line == totalline:
                    continue
                if line['t'] < totalline['t']-5:
                    continue
                if line['t'] > totalline['t']+(totalline['b']-totalline['t'])+20:
                    continue
                try:
                    ret["total"] = int(float(line["text"].replace(" ","").replace("$",""))*100)
                except ValueError:
                    continue
                ret["totalbox"] = self.expandbox(ret["totalbox"],line)
                break

        return ret

if __name__ == "__main__":
    parsed = OCR(sys.argv[1])
    print json.dumps(parsed.maxbounds(), indent=2)
    print json.dumps(parsed.guess(), indent=2, default=str)
