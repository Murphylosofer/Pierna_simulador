# Genera los STL ajustados (ESTUDIOS y STL/STL Rodilla ajustada) a partir de los originales, sin tocar estos:
#   1. AFS1 con dos ranuras traseras (paso de los eslabones diagonales) + el tope escondido.
#   2. El eje de 70 mm del punto B partido en dos ejes cortos (solo lo que queda fuera de las paredes).
# Luego mueve el mecanismo de 0° a 135° y reporta choques. Requiere: pip install trimesh manifold3d shapely scipy
# El contorno del tope se lee de un JSON que genera Node (ver más abajo). Uso: python scripts/recortes_stl.py tope.json
import os, sys
import trimesh, numpy as np, manifold3d as m3, sys, glob, os
D_=os.path.join(os.path.dirname(__file__),'..','ESTUDIOS y STL','STL Rodilla')+os.sep
def L(n): return trimesh.load(D_+'Ensamblaje1 - '+n+'.STL')
P={'afs1':L('AFS1-1'),'inf':L('adapatador femoral inferior-1')}
for i in range(1,5): P['e%d'%i]=L('eslabonnnnn-%d'%i)
for i in (1,2): P['s%d'%i]=L('Eje Superior-%d'%i); P['x%d'%i]=L('Eslabon2-%d'%i)
cen=lambda m: m.bounds.mean(0)
A0=np.array([-2.555,-15.0]);B0=np.array([-29.68,-20.0]);C=np.array([-22.88,-99.71]);D=np.array([23.91,-90.49])
def rot(v,a): c,s=np.cos(a),np.sin(a); return np.array([c*v[0]-s*v[1],s*v[0]+c*v[1]])
L1=np.linalg.norm(A0-D);L2=np.linalg.norm(B0-C);print('L1 AD',L1,'L2 BC',L2)
def solve(th,prev):
  w=rot(B0-A0,th);c2=C-w;dv=c2-D;d=np.linalg.norm(dv);a=(L1*L1-L2*L2+d*d)/(2*d);h2=L1*L1-a*a
  if h2<0: return None
  h=np.sqrt(h2);m=D+a*dv/d;n=np.array([-dv[1],dv[0]])/d
  s=[m+h*n,m-h*n];return min(s,key=lambda q:np.linalg.norm(q-prev))
def T2(ang,p0,p1):
  # rotate about z by ang mapping p0->p1 (2D in xy)
  M=np.eye(4);c,s=np.cos(ang),np.sin(ang);M[:2,:2]=[[c,-s],[s,c]];M[:2,3]=p1-rot(p0,ang);return M
# which links are AD (inner) vs BC (outer)
def ends(m):
  v=m.vertices;return v[:,:2]
grupo={}
for k in ['e1','e2','e3','e4']:
  c=cen(P[k])[:2];grupo[k]='AD' if np.linalg.norm(c-(A0+D)/2)<np.linalg.norm(c-(B0+C)/2) else 'BC'
for k in ['s1','s2','x1','x2']:
  c=cen(P[k])[:2];grupo[k]=min('ABCD',key=lambda q:np.linalg.norm(c-dict(A=A0,B=B0,C=C,D=D)[q]))
print(grupo)
def poses(th):
  A=solve(th,A0 if th<0.3 else poses.prevA); poses.prevA=A
  if A is None: return None
  B=A+rot(B0-A0,th)
  Mt=T2(th,A0,A)
  aAD=np.arctan2(*(A-D)[::-1])-np.arctan2(*(A0-D)[::-1]); aBC=np.arctan2(*(B-C)[::-1])-np.arctan2(*(B0-C)[::-1])
  M={'afs1':Mt,'inf':np.eye(4)}
  for k,g in grupo.items():
    if g=='AD': M[k]=T2(aAD,D,D)
    elif g=='BC': M[k]=T2(aBC,C,C)
    elif g in 'AB': M[k]=Mt
    else: M[k]=np.eye(4)
  return M,A,B,aAD,aBC
poses.prevA=A0
def man(m): return m3.Manifold(m3.Mesh(vert_properties=np.asarray(m.vertices,np.float32),tri_verts=np.asarray(m.faces,np.uint32)))
MAN={k:man(m) for k,m in P.items()}
def tr(mf,M): return mf.transform(M[:3,:4])
import json, itertools, os
from shapely.geometry import Polygon, Point
TA=np.array([25.5,-23.357]); zc=1255.285
P1=np.array([-47.0,23.357]); P2=np.array([-27.0,14.0])  # recta del corte, marco del AFS1
d=(P2-P1)/np.linalg.norm(P2-P1)
# region detras/arriba de la recta (lado de la parte trasera)
far=lambda p,s: p+s*d
n=np.array([-d[1],d[0]])
if np.dot(np.array([-58,13])-P1,n)<0: n=-n
poly_l=[far(P1,-60), far(P2,60), far(P2,60)+80*n, far(P1,-60)+80*n]; pg=Polygon(poly_l)
assert pg.contains(Point(-58,13.2)), 'lado'
pgS=Polygon([tuple(np.array(p)+TA) for p in pg.exterior.coords])
def prisma(poly,z0,z1):
  m=trimesh.creation.extrude_polygon(poly,z1-z0); m.apply_translation([0,0,z0]); return man(m)
corte=prisma(pgS,zc+18.0,zc+23.5)+prisma(pgS,zc-23.5,zc-18.0)
tope=Polygon(json.load(open(sys.argv[1])))
topeM=prisma(tope,zc-23.5,zc+23.5)
afsA=(MAN['afs1']-corte)+topeM
caja=lambda z0,z1: man(trimesh.creation.box(bounds=[[-60,-60,z0],[60,60,z1]]))
xB=MAN['x2']; corto1=xB^caja(zc+23.5,zc+40); corto2=xB^caja(zc-40,zc-23.5)
print('vol AFS1 orig',MAN['afs1'].volume(),'ajustado',afsA.volume(),'quitado ranuras',(MAN['afs1']^corte).volume(),'tope',topeM.volume())
print('ejes cortos vol',corto1.volume(),corto2.volume())
NUEVO={k:v for k,v in MAN.items()}; NUEVO['afs1']=afsA; del NUEVO['x2']; NUEVO['x2a']=corto1; NUEVO['x2b']=corto2
grupo['x2a']=grupo['x2b']='B'
def pose_en(th):
  poses.prevA=A0
  for t in np.linspace(0,th,max(2,int(abs(th)*2))): r=poses(np.radians(t))
  M=r[0]; M['x2a']=M['x2b']=M['afs1']; return M
peor=0
for th in list(np.arange(0.5,135.01,2.5))+[135]:
  M=pose_en(th); W={k:tr(NUEVO[k],M[k]) for k in NUEVO}
  for a,b in itertools.combinations(NUEVO,2):
    v=(W[a]^W[b]).volume()
    if v>0.5: print('CHOQUE',th,a,b,round(v,3)); peor=max(peor,v)
print('peor',peor)
# extension: tope debe detener (contacto a -0.5)
M=pose_en(-0.5); print('a -0.5 deg tope vs e3:',(tr(NUEVO['afs1'],M['afs1'])^tr(NUEVO['e3'],M['e3'])).volume())
# recta en STL para instrucciones
yb=lambda x: 12.86+(16.364-12.86)/(20.13+58.28)*(x+58.28)
# interseccion de la recta con el fondo de la placa
from scipy.optimize import brentq
s=brentq(lambda s:(P1+s*d)[1]-yb((P1+s*d)[0]),0,60); Q=P1+s*d
print('corte: arriba x=',P1,'abajo en fondo de placa',np.round(Q,2),'angulo',np.degrees(np.arctan2(-d[1],d[0])))
out=os.path.join(os.path.dirname(__file__),'..','ESTUDIOS y STL','STL Rodilla ajustada'); os.makedirs(out,exist_ok=True)
def guarda(mf,n):
  mm=mf.to_mesh(); t=trimesh.Trimesh(np.array(mm.vert_properties)[:,:3],np.array(mm.tri_verts)); t.export(os.path.join(out,n)); print(n,t.is_watertight,len(t.faces))
guarda(afsA,'Ensamblaje1 - AFS1-1 ajustado.STL'); guarda(corto1,'Eje corto B-1.STL'); guarda(corto2,'Eje corto B-2.STL')
# Contorno del tope en coordenadas del STL (para el argumento):
#   node -e "import('./src/ensamble.js').then(m=>{const e=m.ensambleActual();const T=[-22.88,-103.07];console.log(JSON.stringify(e.tope.contorno.map(([x,y])=>[x+T[0]+e.O[0],y+T[1]+e.O[1]])))})" > tope.json
