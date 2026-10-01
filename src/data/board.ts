import type { Space } from '../types/game';

const p=(index:number,id:string,he:string,en:string,group:Space['group'],price:number,rents:number[],buildingCost:number):Space=>({index,id,type:'property',name:{he,en},group,price,rents,mortgage:Math.floor(price/2),buildingCost});
const s=(index:number,id:string,he:string,en:string):Space=>({index,id,type:'station',name:{he,en},price:200,rents:[25,50,100,200],mortgage:100});
const u=(index:number,id:string,he:string,en:string):Space=>({index,id,type:'utility',name:{he,en},price:150,mortgage:75});
const x=(index:number,id:string,type:Space['type'],he:string,en:string,extra:Partial<Space>={}):Space=>({index,id,type,name:{he,en},...extra});

export const board:Space[]=[
 x(0,'start','start','יוצאים לדרך','LET\'S GO!',{subtitle:{he:'קבל 200 זוזים',en:'Collect 200 Zuzim'}}),
 p(1,'bnei-brak','בני ברק','Bnei Brak','brown',60,[2,10,30,90,160,250],50),
 x(2,'good-1','good','מעשה טוב','GOOD DEEDS'),
 p(3,'mea-shearim','מאה שערים','Mea Shearim','brown',60,[4,20,60,180,320,450],50),
 x(4,'shabbat-shopping','tax','קניות לשבת','SHABBAT SHOPPING',{tax:200}),
 s(5,'ben-gurion','נמל התעופה בן גוריון','Ben Gurion Airport'),
 p(6,'tiberias','טבריה','Tiberias','lightblue',100,[6,30,90,270,400,550],50),
 x(7,'mazal-1','mazal','מזל טוב','MAZAL TOV'),
 p(8,'meron','מירון','Meron','lightblue',100,[6,30,90,270,400,550],50),
 p(9,'tzfat','צפת','Tzfat','lightblue',120,[8,40,100,300,450,600],50),
 x(10,'jail','jail','תקוע בפקק','STUCK IN TRAFFIC',{subtitle:{he:'או רק מבקר...',en:'Or just visiting...'}}),
 p(11,'ashdod','אשדוד','Ashdod','pink',140,[10,50,150,450,625,750],100),
 u(12,'mekorot','מקורות','Mekorot'),
 p(13,'netanya','נתניה','Netanya','pink',140,[10,50,150,450,625,750],100),
 p(14,'beit-shemesh','בית שמש','Beit Shemesh','pink',160,[12,60,180,500,700,900],100),
 s(15,'jerusalem-central','תחנה מרכזית ירושלים','Jerusalem Central Station'),
 p(16,'kinneret','הכנרת','Sea of Galilee','orange',180,[14,70,200,550,750,950],100),
 x(17,'good-2','good','מעשה טוב','GOOD DEEDS'),
 p(18,'akko','עכו','Akko','orange',180,[14,70,200,550,750,950],100),
 p(19,'caesarea','קיסריה','Caesarea','orange',200,[16,80,220,600,800,1000],100),
 x(20,'free','free','חניה בירושלים','FREE PARKING',{subtitle:{he:'נס גלוי',en:'A tiny miracle'}}),
 p(21,'hebron','חברון','Hebron','red',220,[18,90,250,700,875,1050],150),
 x(22,'mazal-2','mazal','מזל טוב','MAZAL TOV'),
 p(23,'machpela','מערת המכפלה','Cave of the Patriarchs','red',220,[18,90,250,700,875,1050],150),
 p(24,'rachels-tomb','קבר רחל','Rachel\'s Tomb','red',240,[20,100,300,750,925,1100],150),
 s(25,'tel-aviv-rail','רכבת תל אביב','Tel Aviv Railway'),
 p(26,'masada','מצדה','Masada','yellow',260,[22,110,330,800,975,1150],150),
 p(27,'ein-gedi','עין גדי','Ein Gedi','yellow',260,[22,110,330,800,975,1150],150),
 u(28,'electric','חברת החשמל','Electric Company'),
 p(29,'dead-sea','ים המלח','Dead Sea','yellow',280,[24,120,360,850,1025,1200],150),
 x(30,'go-jail','go-jail','נכנסת לפקק!','GO TO TRAFFIC'),
 p(31,'old-city','העיר העתיקה','Jerusalem Old City','green',300,[26,130,390,900,1100,1275],200),
 p(32,'mount-olives','הר הזיתים','Mount of Olives','green',300,[26,130,390,900,1100,1275],200),
 x(33,'good-3','good','מעשה טוב','GOOD DEEDS'),
 p(34,'city-david','עיר דוד','City of David','green',320,[28,150,450,1000,1200,1400],200),
 s(35,'jerusalem-rail','רכבת ירושלים','Jerusalem Railway'),
 x(36,'mazal-3','mazal','מזל טוב','MAZAL TOV'),
 p(37,'western-wall','הכותל המערבי','Western Wall','blue',350,[35,175,500,1100,1300,1500],200),
 x(38,'wedding-season','tax','עונת החתונות','WEDDING SEASON',{tax:100}),
 p(39,'jerusalem','ירושלים','Jerusalem','blue',400,[50,200,600,1400,1700,2000],200),
];

export const groupColors:Record<string,string>={brown:'#8b5e3c',lightblue:'#73c7e8',pink:'#d568a5',orange:'#e9923b',red:'#d94a45',yellow:'#e8c949',green:'#3f8b59',blue:'#315a9b'};
