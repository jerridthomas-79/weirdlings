# Makes a cartoon sticker board marker from a transparent creature PNG:
# head close-up, cartoon filter (flattened colors + dark ink lines), thick #2B2340 outline.
# Box = the head area as fractions of the image (x0 y0 x1 y1).
# Usage: python3 tools/make-marker.py creature.png assets/creatures/cNN.webp 0.4 0 1 0.55
# BOX below records the boxes used for the first 19 creatures. Needs opencv + pillow.
import cv2, numpy as np
from PIL import Image
TOON_INK = np.array([64,35,43], np.float32)
def toonify(rgba, k=18):
    a = np.array(rgba); al = a[...,3]
    bgr = cv2.cvtColor(a[...,:3].copy(), cv2.COLOR_RGB2BGR)
    sm = bgr
    for _ in range(3): sm = cv2.bilateralFilter(sm, 9, 45, 7)
    sm = cv2.pyrMeanShiftFiltering(sm, 9, 24)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).reshape(-1,3).astype(np.float32)
    m = al.reshape(-1) > 40
    crit=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, lbl, ctr = cv2.kmeans(lab[m], k, None, crit, 3, cv2.KMEANS_PP_CENTERS)
    q = lab.copy(); q[m] = ctr[lbl.flatten()]
    q = cv2.cvtColor(q.reshape(sm.shape).astype(np.uint8), cv2.COLOR_LAB2BGR)
    q = cv2.medianBlur(q, 7)
    q = cv2.addWeighted(q, 0.8, sm, 0.2, 0)
    hsv = cv2.cvtColor(q, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[...,1] = np.clip(hsv[...,1]*1.3, 0, 255); hsv[...,2] = np.clip(hsv[...,2]*1.05+6, 0, 255)
    q = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    g = cv2.medianBlur(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY), 9)
    e = 255 - cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, 8)
    e[al < 128] = 0
    n, cc, st, _ = cv2.connectedComponentsWithStats(e, 8)
    keep = np.zeros_like(e)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= 140: keep[cc == i] = 255
    keep = cv2.GaussianBlur(keep, (3,3), 0)
    f = (keep.astype(np.float32)/255.0)[...,None]*0.85
    q = (q*(1-f) + TOON_INK*f).astype(np.uint8)
    return Image.fromarray(np.dstack([cv2.cvtColor(q, cv2.COLOR_BGR2RGB), al]), 'RGBA')

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
import sys
names={}  # original upload ids (not kept); pass a file path for new art
BOX={'11':(.28,.02,.95,.62),'12':(.45,0,1,.55),'17':(.55,.08,1,.58),'06':(.2,.08,.82,.68),'03':(.3,.02,1,.62),
'05':(.42,0,.98,.62),'13':(.42,0,1,.55),'14':(.45,.12,1,.6),'09':(.3,.05,.95,.68),'10':(.15,.02,.95,.7),
'01':(.25,0,.85,.6),'24':(.45,.2,1,.7),'02':(0,0,1,.47),'04':(.12,0,.98,.72),'07':(.1,.06,.9,.62),
'19':(.48,.1,1,.66),'20':(.5,0,1,.38),'23':(.45,.05,1,.6),'18':(.36,0,.79,.4)}
INK=(43,35,64,255); S=640; OUT=320
def make(n, src=None, b=None):
  im=Image.open(src or f'/mnt/user-data/uploads/{names[n]}-image.png').convert('RGBA')
  W,H=im.size; b=b or BOX[n]; x0,y0,x1,y1=b[0]*W,b[1]*H,b[2]*W,b[3]*H
  side=max(x1-x0,y1-y0); cx,cy=(x0+x1)/2,(y0+y1)/2
  box=(round(cx-side/2),round(cy-side/2),round(cx+side/2),round(cy+side/2))
  c=Image.new('RGBA',(box[2]-box[0],box[3]-box[1]),(0,0,0,0)); c.paste(im.crop(box),(0,0))
  pad=int(S*0.06); inner=S-2*pad
  c=c.resize((inner,inner),Image.LANCZOS)
  c=toonify(c)
  # round off cut edges: keep art inside a soft rounded blob
  blob=Image.new('L',(inner,inner),0); ImageDraw.Draw(blob).ellipse((-inner*.03,-inner*.03,inner*1.03,inner*1.03),fill=255)
  a=ImageChops.multiply(c.getchannel('A'),blob)
  a=a.point(lambda v:255 if v>40 else 0).filter(ImageFilter.MedianFilter(5))
  c.putalpha(ImageChops.multiply(a,c.getchannel('A').point(lambda v:255 if v>40 else v*6)))
  c=ImageEnhance.Color(c).enhance(1.25); c=ImageEnhance.Contrast(c).enhance(1.08)
  canvas=Image.new('RGBA',(S,S),(0,0,0,0)); canvas.paste(c,(pad,pad),c)
  A=Image.new('L',(S,S),0); A.paste(a,(pad,pad))
  # fill small holes, then outline: rounded dilation by blur+threshold
  solid=A.filter(ImageFilter.GaussianBlur(10)).point(lambda v:255 if v>60 else 0)
  ring=solid.filter(ImageFilter.GaussianBlur(9)).point(lambda v:255 if v>8 else 0)
  ring=ring.filter(ImageFilter.GaussianBlur(1.2))
  out=Image.new('RGBA',(S,S),(0,0,0,0)); ink=Image.new('RGBA',(S,S),INK); out.paste(ink,(0,0),ring)
  # thin light rim just inside the outline for the sticker pop
  rim=solid.filter(ImageFilter.GaussianBlur(3)).point(lambda v:255 if v>20 else 0)
  out.paste(Image.new('RGBA',(S,S),(255,246,232,255)),(0,0),ImageChops.subtract(rim,A.point(lambda v:255 if v>128 else 0)))
  out.alpha_composite(canvas)
  bb=out.getchannel('A').getbbox(); out=out.crop(bb); w,h=out.size; m=max(w,h)
  sq=Image.new('RGBA',(m,m),(0,0,0,0)); sq.paste(out,((m-w)//2,(m-h)//2))
  return sq.resize((OUT,OUT),Image.LANCZOS)
import os
if len(sys.argv)==7:
  make(None, sys.argv[1], tuple(map(float,sys.argv[3:7]))).save(sys.argv[2], quality=85, method=6)
else:
  os.makedirs('markers',exist_ok=True)
  for n in BOX: make(n).save(f'markers/c{n}.png')
