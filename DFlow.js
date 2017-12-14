function DNode(x, name){
  if (!(this instanceof _DNode)){
    return new _DNode(x, name);
  }
}

var _DNode = function(dnode, name) {
  this.dnode = dnode;
  this.name = name || dnode.name || 'anon_dnode';
  this.debug = /debug/.test(window.location.href);
};

_DNode.prototype = {
  /**
   * looks up activation rule iobject (o.ar)
   * to decide if DNode should be evaluated.
   * lookup happens in this order:
   * ar[o.d property name][this.name][o.d property value]
   * if more than one prop has rules for a given Dnode:
   * iterate through tests and if any of them returns false:
   * break and return false, if undefined: continue
   */
  activate: function(o) {
    if (this.debug) debugger;
    for (prop in o.ar) {
      if (o.d[prop]
        && o.ar[prop][this.name]
        && typeof(o.ar[prop][this.name][o.d[prop]]) == 'boolean') {
        var descrip = '('+prop+': '+o.d[prop]+')'
        var result = o.ar[prop][this.name][o.d[prop]]
        descrip += ' -> '+result;
        if (o.ar_log[this.name]) {
          o.ar_log[this.name] += ', '+descrip;
        } else {
          o.ar_log[this.name] = descrip;
        }
        // return if any condition is false
        if (result === false) {
          return false;
        }
      }
    }
    return true;
  },
  eval: function(o) {
    if (this.debug) debugger;
    o.dnode_name = this.name;
    if (!this.activate(o)) {
      o.key = true;
      return o;
    }
    // standard dnode
    if (this.dnode instanceof Function) {
      try {
        this.dnode(o);
        return o;
      } catch(e) {
        o['error'] = e;
        return o;
      }
     /**
      * chained dnodes in array: the elements do not need to
      * point to eachother with regards to returned keys
      * unlike other instances of DNodes
      */
    } else if (this.dnode instanceof Array) {
      var dnodes = []; // keep track of dnodes we iterated through
      for (var i=0,l=this.dnode.length;i<l;i++) {
        var dnode = this.dnode[i];
        try {
          dnodes.push(dnode.name);
          if (!(dnode instanceof _DNode)) {
            if (dnode instanceof _DTree) {
              o.treeName = dnode.name;
              o.key = dnode.name;
              dnode.traverse(o);
            } else if (dnode instanceof Function) {
              o = dnode(o);
            }
          } else {
            dnode.eval(o);
          }
          if (o && (o.key === 'fin' || o.key === false)) {
            o.dnode_name = dnodes.toString();
            return o;
          }
        } catch(e) {
          o['error'] = e;
          o.dnode_name = dnodes.toString();
          return o;
        }
      }
      o.dnode_name = dnodes.toString();
      return o;
    // all other instances are treated as keys
    } else {
      o.key = this.dnode;
      return o;
    }
  },
  // helper function to update explanations
  explain: function(o,key,reason) {
    if (!reason) { // reset
      o.explain[key] = '';
    } else {
      o.explain[key] = (o.explain[key] ? o.explain[key]+'\n' : '') + reason;
    }
  }
}


function DTree(x, name){
  if (!(this instanceof _DTree)) {
    return new _DTree(x, name);
  }
}

var _DTree = function DTree(tree, name) {
  this.tree = tree;
  this._tree = tree; // track current tree for recursion
  this.name = name || Object.keys(tree)[0] || 'anon_tree';
  this.mode = 'strict'; // break traversal when error
  this.debug = /debug/.test(window.location.href);
  this.verbose = /verbose/.test(window.location.href);
};

_DTree.prototype = {
  traverse: function(o, init) {
    var dnode;
    var nextNode;
    var prev_key;
    o = o || {};
    if (this.debug) debugger;
    // check if this is an init_o
    if (!o.created) o = this.createNewState(o, init);
    this.trackTraversal(o);
    if (this.verbose) {
      console.log(this.name+'.traverse, key: '+o.key);
      console.log(o.traversal);
      if (o.key === 'fin') { console.log('FIN') }
    }
    if (this._tree
      && Object.keys(this._tree).length > 0
      && o.key in this._tree
      && o.key !== 'fin') { // explicit key to end
      prev_key = o.key;
     /**
      * if value is not a map with 'dnode' key
      * treat the value as a dnode itself
      * this allows for flexible nodes and testing
      */
      nextNode = this._tree[o.key];
      if (!nextNode) {
        o['error'] = 'no match for key';
        return o;
      }
      if (nextNode instanceof _DNode) {
        dnode = nextNode;
      } else {
        dnode = nextNode.dnode || nextNode;
      }
      // handle undefined dnodes gracefully
      if (typeof dnode === 'undefined') {
        o['error'] = 'undefined dnode';
        return o;
      }
      // handle non-DNode values
      if (!(dnode instanceof _DNode)) {
        // call Functions to resolve next key
        if (dnode instanceof Function) {
          o.dnode_name = dnode.name || 'anon_Function';
          o = dnode(o);
        // handle nested DTrees
        } else if (dnode instanceof _DTree) {
          // set key to new tree root
          o.key = dnode.name;
          o = dnode.traverse(o);
        } else {
          o.dnode_name = dnode
          o.key = dnode;
        }
      // handle regular Dnode
      } else {
        try {
          o = dnode.eval(o);
        } catch(e) {
          o['error'] = e;
        }
      }
      if (this.mode === 'strict' && o['error']) {
        return o;
      }
     /**
      * advance to next subtree determined by decision
      * if no decisions key, assume end of traversal
      */
      if (!(this._tree && this._tree[prev_key] &&
        this._tree[prev_key].decisions)) {
        if (o) this.trackTraversal(o);
        return o;
      }
      // move to next subtree
      this._tree = this._tree[prev_key].decisions;
      // recurse to next subtree
      return this.traverse(o);
    } else {
      return o;
    }
  },
  // initialize our main state
  createNewState: function createNewState(init_o, init_key) {
    return { // create our main state object
      // expects root key of DTree to be its name
      // unless an init key is passed
      key: init_key || this.name || true,
      d: init_o.d || {},
      ar: init_o.ar || {},
      ar_log: {}, // keep track of activation rules
      treeName: this.name,
      dnode_name: 'root',
      traversal: [], // keep track of visited nodes
      explain: {}, // map logs to dnodes
      created: new Date(),
    };
  },
  // track every decision and transformation during traversal
  trackTraversal: function trackTraversal(o) {
    o.traversal.push({
      treeName: this.name,
      _tree: this._tree,
      key: o.key,
      dnode_name: o.dnode_name,
      created: o.created,
      timestamp: new Date(),
      d: Object.assign({}, o.d),
    });
  },
  /**
   * hacky helper method to allow dynamically defining
   * circular references within a js object assignement
   * this provides the potential for a Graph based
   * decision modelling
   */
  treeSelf: function treeSelf(s, treeName, short) {
    var sh;
    var ret;
    var str;
    var path = s;
    s = s.split('.');
    s = s[s.length-1];
    sh = short ? short : s;
    treeName = treeName || s;
    str = "ret = {dnode: DNode('"+sh+"','"+sh+"'),"+
          "decisions: {"+
          "get "+s+"() {"+
            "var ret="+treeName+"."+path+" || "+
                       treeName+".tree."+path+";"+
            "return ret;}}};"
    eval(str);
    return ret;
  }
}
