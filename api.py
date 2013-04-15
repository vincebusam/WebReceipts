#!/usr/bin/python
import os
import sys
import cgi
import uuid
import urlparse
import parseocr
try:
    # This is much faster if we have it
    import simplejson as json
except:
    import json
from PIL import Image
import cStringIO as StringIO

datadir = os.path.dirname(__file__) + "/data"
dbfn = datadir + "/db.json"
db = []
if os.path.exists(dbfn):
    db = json.load(open(dbfn))

form = cgi.FieldStorage()

def savedb():
    global db, dbfn
    json.dump(db, open(dbfn,"w"), indent=2, default=str)

def output(obj, status=200):
    if status != 200:
        print "Status: %s" % (status)
    print "Content-type: application/json"
    print "Cache-Control: max-age=0, no-cache"
    print
    print json.dumps(obj, default=str, indent=2)
    sys.exit(0)

rcptid = None
endpoint = None
request = urlparse.urlparse(os.getenv("REQUEST_URI")).path.split("/")
apiindex = request.index("api")
if apiindex and len(request) > apiindex+1:
    rcptid = request[apiindex+1]
if apiindex and len(request) > apiindex+2:
    endpoint = request[apiindex+2]

if os.getenv("REQUEST_METHOD") == "POST":
    if rcptid:
        for rcpt in db:
            if rcpt["id"] == rcptid:
                for key in form:
                    rcpt[key] = form.getfirst(key)
                savedb()
                output(rcpt)
    elif "image" in form:
        imageid = uuid.uuid1()
        imagefn = "%s/%s.jpg" % (datadir,imageid)
        open(imagefn, "wb").write(form["image"].value)
        os.system("convert %s -auto-orient -scale 800x800 %s" % (imagefn, imagefn))
        db.append({"id":imageid,"state":"open"})
        savedb()
        output(imageid)
    output(False, 404)

if os.getenv("REQUEST_METHOD") == "GET":
    if rcptid:
        for rcpt in db:
            if rcpt["id"] == rcptid:
                break
        if rcpt["id"] != rcptid:
            output(False, 404)
        if endpoint == "bounds":
            parsed = parseocr.OCR(datadir+"/"+rcptid)
            output(parsed.maxbounds())
        elif endpoint == "ocr":
            parsed = parseocr.OCR(datadir+"/"+rcptid)
            ret = parsed.guess()
            ret["bounds"] = parsed.maxbounds()
            output(ret)
        elif endpoint == "cropimg":
            im = Image.open("%s/%s.jpg" % (datadir, rcptid))
            out = StringIO.StringIO()
            if rcpt.get("crop_width"):
                crop = im.crop([int(rcpt["crop_left"]),
                                int(rcpt["crop_top"]),
                                int(rcpt["crop_left"])+int(rcpt["crop_width"]),
                                int(rcpt["crop_top"])+int(rcpt["crop_height"])])
            else:
                crop = im
            crop.save(out, "jpeg")
            print "Content-type: image/jpeg"
            print
            print out.getvalue()
            sys.exit()
        output(rcpt)
    for key in form:
        db = [x for x in db if (x.get(key) or "unset") == form.getfirst(key)]
    output(db)

print json.dumps(False, 400)
