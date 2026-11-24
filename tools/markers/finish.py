# sticker border: cream ring + thin ink ring, like the original toad marker
from PIL import Image, ImageFilter, ImageChops
import glob, os
os.makedirs('tools/markers/final', exist_ok=True)
for f in sorted(glob.glob('tools/markers/raw/*.png')):
    im = Image.open(f).convert('RGBA'); W = 760
    c = Image.new('RGBA', (W, W), (0,0,0,0)); c.paste(im, ((W-im.width)//2, (W-im.height)//2))
    a = c.getchannel('A').point(lambda v: 255 if v > 30 else 0)
    solid = a.filter(ImageFilter.GaussianBlur(8)).point(lambda v: 255 if v > 40 else 0)
    cream = solid.filter(ImageFilter.GaussianBlur(9)).point(lambda v: 255 if v > 30 else 0)
    ink = cream.filter(ImageFilter.GaussianBlur(7)).point(lambda v: 255 if v > 18 else 0).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new('RGBA', (W, W), (0,0,0,0))
    out.paste(Image.new('RGBA', (W, W), (43,35,64,255)), (0,0), ink)
    out.paste(Image.new('RGBA', (W, W), (255,248,236,255)), (0,0), cream.filter(ImageFilter.GaussianBlur(1)))
    out.alpha_composite(c)
    bb = out.getchannel('A').getbbox(); out = out.crop(bb); w, h = out.size; m = max(w, h)
    sq = Image.new('RGBA', (m, m), (0,0,0,0)); sq.paste(out, ((m-w)//2, (m-h)//2))
    sq.resize((320, 320), Image.LANCZOS).save('assets/creatures/' + os.path.basename(f))
fs = sorted(glob.glob('assets/creatures/*.png')); T = 160
sh = Image.new('RGB', (5*T, 4*T), (124,203,107))
cols = [(245,163,192),(253,170,107),(229,185,74),(124,203,107),(74,184,180),(108,186,232),(155,126,219)]
for i, f in enumerate(fs):
    t = Image.new('RGBA', (T, T), cols[i%7]+(255,)); m = Image.open(f).resize((int(T*.86),)*2, Image.LANCZOS)
    t.alpha_composite(m, (int(T*.07),)*2); sh.paste(t, ((i%5)*T, (i//5)*T))
sh.save('tools/markers/sheet.png')
