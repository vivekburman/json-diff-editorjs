// Important links
// https://blog.jcoglan.com/2017/04/25/myers-diff-in-linear-space-implementation/

export default class JSONDiff {
  
  constructor(oldObj, newObj) {
    this.oldObj = oldObj;
    this.newObj = newObj;
    this.jsonPatch = [];
    this.deletes = {};  
  }

  isEmpty = (obj) => {
    if (typeof obj != 'number' && obj == null || obj == undefined) return true;
    else if(Array.isArray(obj) && obj.length == 0) return true;
    else if(typeof obj == 'object') {
      for(let i in obj) return false;
      return true;
    }
    return false;
  }

  getKeys(obj) {
      if (Array.isArray(obj)) {
        const keys = new Array(obj.length);
        for (let k = 0; k < obj.length; k++) {
          keys[k] = `_${k}`;
        }
        return keys;
      }
      return Object.keys(obj);
  }

  generateArrDiff(oldArr, newArr, path) {
    this.walkMiddleSnake(oldArr, newArr, path);
  }
  setDelete(path) {
    // make sure inserted to jsonPatch first else will be error
    this.deletes[path] = this.jsonPatch.length - 1;
  }
  generateObjDiff(oldObj=this.oldObj, newObj=this.newObj, path='', pushToArr=this.jsonPatch) {
    if (this.isEmpty(oldObj)) {
      pushToArr.push({op: "add", path: `${path ? path : '/'}`, value: newObj});
    } else if (this.isEmpty(newObj)) {
      pushToArr.push({op: "delete", path: `${path ? path : '/'}`});
      this.setDelete(`${path ? path : '/'}`);
    } else {
      const oldKeys = this.getKeys(oldObj);
      const newKeys = this.getKeys(newObj);
      for (let t = 0; t < oldKeys.length; t++) {

        // 1. if the value of key is not an array/object/function
        if (typeof oldObj[oldKeys[t]] != 'object' && typeof oldObj[oldKeys[t]] != 'function') {
          // 1.2. check if the key is not present in new, then delete key
          // 1.3. else if key is present, check if value is different replace the value
          // 1.4. else same, then skip
  
          if (!newObj.hasOwnProperty(oldKeys[t])) {
            const _p = `${path}/${oldKeys[t]}`;
            pushToArr.push({op: "delete", path: _p});
            this.setDelete(_p);
          }
          else if (newObj[oldKeys[t]] != oldObj[oldKeys[t]]) {
            pushToArr.push({op: "replace", path: `${path}/${oldKeys[t]}`, value: newObj[oldKeys[t]]});
          }
        }
  
        // 2. if it is an object
        else if (typeof oldObj[oldKeys[t]] == 'object' && !Array.isArray(oldObj[oldKeys[t]]) && !Array.isArray(newObj[oldKeys[t]])) {
          // 2.2 if newObj does not has that property then delete
          // 2.3 else recursive call
  
          if (!newObj.hasOwnProperty(oldKeys[t])) {
            const _p = `${path}/${oldKeys[t]}`;
            pushToArr.push({op: "delete", path: _p});
            this.setDelete(_p);

          } else {
            this.generateObjDiff(oldObj[oldKeys[t]], newObj[oldKeys[t]], `${path}/${oldKeys[t]}`);
          }
        }
  
        // 3. if it is an array, use myer's algo
        else if (Array.isArray(oldObj[oldKeys[t]]) && Array.isArray(newObj[oldKeys[t]])) {
          this.generateArrDiff(oldObj[oldKeys[t]], newObj[oldKeys[t]], `${path}/${oldKeys[t]}`);
        }
      }
      // 4. add all the remaining new properties to patch
      for (let t = 0; t < newKeys.length; t++) {
        if (!this.isEmpty(newObj[newKeys[t]]) && !oldObj.hasOwnProperty(newKeys[t])) {
          pushToArr.push({op: "add", path: `${path}/${newKeys[t]}`, value: newObj[newKeys[t]]});
        }
      }
    }
    this.oldObj = {};
    this.newObj = {};
  }
  comparisonOperation(a, b) {
    if (!a || !b) {
      return;
    }
    // if string / number
    if ((typeof a == 'string' && typeof b =='string') || (typeof a == 'number' && typeof b == 'number')) {
      return a == b;
    } else if(!Array.isArray(a) && !Array.isArray(b)){
      // if object, deep check
      if (a.hasOwnProperty('type') && a.type != b.type) return false;

      const akeys = Object.keys(a);
      const bkeys = Object.keys(b);

      for(let i = 0; i < akeys.length; i++) {
        if (akeys[i] == 'type') continue;
        if (!b.hasOwnProperty(akeys[i])) return false;
        const state = this.comparisonOperation(a[akeys[i]], b[akeys[i]]);
        if (state == false) return false;
      }
      for (let i = 0; i < bkeys.length; i++) {
        if (!a.hasOwnProperty(bkeys[i])) return false;
      }
      return true;
    } else if (Array.isArray(a) && Array.isArray(b)) { // if array, checking by index
      if (a.length != b.length) return false;
      else{
        for(let i = 0; i < a.length; i++) {
          const state = this.comparisonOperation(a[i], b[i]);
          if (state == false) return false;
        }
        return true;
      }
    }
  }
  modCalc(x, y) {
    return (x + y) % y;
  }
  forwardShortestEdit(box, vForward, vBackward, i, oldArr, newArr) {
    for (var k = i; k >= -i; k-=2) {
      let c = k - box.delta;
      let px, x;
      if (k == -i || (k != i && vForward[this.modCalc(k - 1, vForward.length)] < vForward[this.modCalc(k + 1, vForward.length)])) {
        px = x = vForward[this.modCalc(k + 1, vForward.length)]
      } else {
        px = vForward[this.modCalc(k - 1, vForward.length)];
        x = px + 1;
      }
      let y = box.top + (x - box.left) - k;
      let py = (i == 0 || x != px) ? y : y - 1;
      while (x < box.right && y < box.bottom && this.comparisonOperation(oldArr[x], newArr[y])) {
        x = x + 1;
        y = y + 1;
      }
      vForward[this.modCalc(k, vForward.length)] = x;
      if (box.delta % 2 != 0 && c >= -(i - 1) && c <= (i - 1) && y >= vBackward[this.modCalc(c, vBackward.length)]) {
        return [
          [px, py],
          [x, y]
        ]
      } 
    }
  }
  backwardShortestEdit(box, vForward, vBackward, i, oldArr, newArr) {
    for (var c = i; c >= -i; c-=2) {
      let k = c + box.delta;
      let py, y;
      if (c == -i || (c != i && vBackward[this.modCalc(c - 1, vBackward.length)] > vBackward[this.modCalc(c + 1, vBackward.length)])) { 
        py = y = vBackward[this.modCalc(c + 1, vBackward.length)]
      } else {
        py = vBackward[this.modCalc(c - 1, vBackward.length)];
        y = py - 1;
      }
      let x = box.left + (y - box.top) + k;
      let px = (i == 0 || y != py) ? x : x + 1;
      while (x > box.left && y > box.top && this.comparisonOperation(oldArr[x - 1], newArr[y - 1])) {
        x = x - 1;
        y = y - 1;
      }
      vBackward[this.modCalc(c, vBackward.length)] = y;
      if (box.delta % 2 == 0 && k >= -i && k <= i && x <= vForward[this.modCalc(k, vForward.length)]) {
        return [
          [x, y],
          [px, py]
        ]
      } 
    }

  }
  findMiddleSnake(box, oldArr, newArr) {
    if (box.size == 0) return;
    const max = Math.ceil(box.size / 2);
    const vForward = new Array(2 * max + 1);
    vForward[1] = box.left;
    const vBackward = new Array(2 * max + 1);
    vBackward[1] = box.bottom;
    for (var i = 0; i <= max; i++) {
      const forward = this.forwardShortestEdit(box, vForward, vBackward, i, oldArr, newArr);
      const backward = this.backwardShortestEdit(box, vForward, vBackward, i, oldArr, newArr);
      if (forward || backward) {
        return forward || backward;
      }
    }
  }
  findPath(left, top, right, bottom, oldArr, newArr) {
    const box = new Box(left, top, right, bottom);
    const snake = this.findMiddleSnake(box, oldArr, newArr);

    if (!snake) return;

    const start = snake[0];
    const finish = snake[1];

    const head = this.findPath(box.left, box.top, start[0], start[1], oldArr, newArr);
    const tail = this.findPath(finish[0], finish[1], box.right, box.bottom, oldArr, newArr);
    return [
      ...head || [start],
      ...tail || [finish]
    ];
  }
  callbackFunc (x1, y1, x2, y2, oldArr, newArr, path_) {
    if (x1 == x2) {
      const _p = `${path_}/${y1}`;
      if (typeof newArr[y1] == 'object' && !Array.isArray(newArr[y1]) && this.deletes.hasOwnProperty(_p)) {
      // if there is a delete at same index and the type is object check for partial update
          const arr = [];
          this.generateObjDiff(oldArr[y1], newArr[y1], `${path_}/${y1}`, arr);
          this.jsonPatch.splice(this.deletes[_p], 1, ...arr);
      } else {
        if (this.deletes.hasOwnProperty(_p)) {
          this.jsonPatch.splice(this.deletes[_p], 1, {
            op: 'replace',
            path: `${path_}/${y1}`,
            value: newArr[y1]
          });
        } else {
          this.jsonPatch.push({
            op: 'add',
            path: `${path_}/${y1}`,
            value: newArr[y1]
          });
        }
      }
    } else if(y1 == y2) {
      const _p = `${path_}/${x1}`;
      this.jsonPatch.push({
        op: 'delete',
        path: _p
      });
      this.setDelete(_p);
    }
  }
  walkMiddleSnake(oldArr, newArr, path_) {
    const path = this.findPath(0, 0, oldArr.length, newArr.length, oldArr, newArr);
    if (!path || path.length == 0) return;

    for(var i = 0; i < path.length - 1; i++) {
      let pair1 = path[i];
      const pair2 = path[i + 1];
      pair1 = this.walkDiagonal(pair1, pair2, oldArr, newArr);
      
      const val1 = (pair2[0] - pair1[0]);
      const val2 = (pair2[1] - pair1[1]);

      if (val1 < val2) {
        this.callbackFunc(pair1[0], pair1[1], pair1[0], pair1[1] + 1, oldArr, newArr, path_);
        pair1[1]++;
      } else if (val1 > val2) {
        this.callbackFunc(pair1[0], pair1[1], pair1[0] + 1, pair1[1], oldArr, newArr, path_);
        pair1[0]++;
      }
      this.walkDiagonal(pair1, pair2, oldArr, newArr);
    }
  }
  walkDiagonal (pair1, pair2, oldArr, newArr) {
    while (pair1[0] < pair2[0] && pair1[1] < pair2[1] && this.comparisonOperation(oldArr[pair1[0]], newArr[pair1[1]])) {
      // this.callbackFunc(pair1[0], pair1[1], pair1[0] + 1, pair1[1] + 1, oldArr, newArr, path_);
      pair1[0]++;
      pair1[1]++;
    }
    return [pair1[0], pair1[1]];
  }
}

class Box {
  constructor(left, top, right, bottom) {
    this.top = top;
    this.bottom = bottom;
    this.left = left;
    this.right = right;
    this.width = right - left;
    this.height = bottom - top;
    this.size = this.width + this.height;
    this.delta = this.width - this.height;
  }
}