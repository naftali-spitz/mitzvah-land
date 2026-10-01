import { describe, expect, it } from 'vitest';
import { board } from '../data/board';
import { calculateRent, canBuild, ownsGroup } from './rules';
import type { Ownership } from '../types/game';

describe('Mitzvah Land rules',()=>{
  it('calculates base rent',()=>{
    const own:Record<string,Ownership>={'bnei-brak':{ownerId:'p1',mortgaged:false,houses:0}};
    expect(calculateRent(board[1],own,7)).toBe(2);
  });
  it('doubles rent for a complete color group without buildings',()=>{
    const own:Record<string,Ownership>={
      'bnei-brak':{ownerId:'p1',mortgaged:false,houses:0},'mea-shearim':{ownerId:'p1',mortgaged:false,houses:0}
    };
    expect(ownsGroup('p1','brown',own)).toBe(true);
    expect(calculateRent(board[1],own,7)).toBe(4);
  });
  it('uses house rent',()=>{
    const own:Record<string,Ownership>={
      'bnei-brak':{ownerId:'p1',mortgaged:false,houses:2},'mea-shearim':{ownerId:'p1',mortgaged:false,houses:2}
    };
    expect(calculateRent(board[1],own,7)).toBe(30);
  });
  it('mortgaged property charges no rent',()=>{
    const own:Record<string,Ownership>={'bnei-brak':{ownerId:'p1',mortgaged:true,houses:0}};
    expect(calculateRent(board[1],own,7)).toBe(0);
  });
  it('stations scale by count',()=>{
    const own:Record<string,Ownership>={
      'ben-gurion':{ownerId:'p1',mortgaged:false,houses:0},'jerusalem-central':{ownerId:'p1',mortgaged:false,houses:0}
    };
    expect(calculateRent(board[5],own,7)).toBe(50);
  });
  it('utilities use dice',()=>{
    const one:Record<string,Ownership>={'mekorot':{ownerId:'p1',mortgaged:false,houses:0}};
    expect(calculateRent(board[12],one,8)).toBe(32);
    one.electric={ownerId:'p1',mortgaged:false,houses:0};
    expect(calculateRent(board[12],one,8)).toBe(80);
  });
  it('enforces balanced building',()=>{
    const own:Record<string,Ownership>={
      'bnei-brak':{ownerId:'p1',mortgaged:false,houses:1},'mea-shearim':{ownerId:'p1',mortgaged:false,houses:0}
    };
    expect(canBuild('p1',board[1],own)).toBe(false);
    expect(canBuild('p1',board[3],own)).toBe(true);
  });
});
