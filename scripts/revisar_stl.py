# Revisión independiente con las mallas STL completas (no con prismas): mueve el mecanismo de 0° a 140°
# y reporta el primer ángulo en que se enciman dos piezas. Requiere: pip install trimesh manifold3d numpy
# Uso: python scripts/revisar_stl.py
import os
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
import itertools
def pose_en(th):
  poses.prevA=A0
  for t in np.linspace(0,th,max(2,int(abs(th)*2))): r=poses(np.radians(t))
  return r[0]
def vol(th,a,b):
  M=pose_en(th); return (tr(MAN[a],M[a])^tr(MAN[b],M[b])).volume()
pares=[('e3','x2'),('e4','x2'),('e3','afs1'),('e4','afs1')]
for th in range(0,141,5):
  M=pose_en(th); W={k:tr(MAN[k],M[k]) for k in P}
  hits=[f'{a}-{b}' for a,b in itertools.combinations(P,2) if (W[a]^W[b]).volume()>0.5]
  print(f'{th:4d}°', hits or 'sin choques')
def primero(a,b,lo,hi):
  for _ in range(25):
    m=(lo+hi)/2
    if vol(m,a,b)>1e-3: hi=m
    else: lo=m
  return round(lo,2)
print('Primer contacto eslabón diagonal × eje de 70 (B):',primero('e3','x2',20,60),'°')
print('Primer contacto eslabón diagonal × AFS1:',primero('e3','afs1',60,130),'°')
