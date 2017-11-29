# DFlow
This library attempts to make an abstraction of flow-based programming via a decision tree.
This tree is materialized by a javascript Object that is visually intuitive, easily composable and fully controllable.
The syntax can be seen as a combination of declarative programming at the tree level and imperative at the node level. 

## DTree
A decision tree takes an `Object` as its constructor as follows:
```
var Flow = DTree({
  Flow: {
    dnode: startLogic,
    decisions: {
      true: trueLogic,
      false: falseLogic
      turkmenistan: alternativeLogic
    }
  }
});
```
The above can be vizualized as:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex1.png" width="50%"><br>
Where the edges are named after the different decisions that can be made by the parent Dnode.

Igniting the flow is done by calling the `_DTree.prototype.traverse(d)` method which takes a data object as argument. At the beginning of the traversal, this data object is set as a property of `o`, the tree's initialized global state. This state is passed around by reference from node to node, it trickles down the tree. 
In this example we would call `Flow.traverse({kpi: 0.13})`, which would then evaluate `startLogic` and expect it to return a key to point to the next node inside the `decisions` map.

The global state `o` is composed of fundamental and peripheral properties that are used for direction, tracking and as variables (`o.d`) determining the outcome of DNodes:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex5.png" width="50%">
<br>
After the root node, the tree is traversed recursively. At every recusrive step, the tree will try to evaluate the immediate Dnode, passing it the current global state `o`, and expecting it to update the latter with a key that points to the next DNode to evaluate or asking it to break with flags  `'fin'` and `'error'` or simply when not finding any subsequent nodes.

`_Dtree.prototype.trackTraversal(o)` is called each step, it stores the context and some global state properties for ease of development and troubleshooting:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex4.png">
<br>

## DNode
A decision node contains the logic that makes the decision for the next step to follow.
```
var startLogic = DNode(function dLogic(o) {
  o.key = false;
  if (o.kpi > 0.10) o.key = true;
  if (o.kpi === 111) o.key = 'turkmenistan';
});
```
The above code highlights the fundamental role `o.key` plays in the flow. At least one of the outcome keys should map to a property of the decision object paired with the Dnode. You do not need to return the state, it already passed by reference in the protoype.

A Dnode can be different things:

  - ### Function
```
var dlogic = DNode(function logic(o) {
  o.key = false;
  if (o.color = 'green') o.key = true;
});
```

  - ### Array
When data is meant to flow in a series of transforms, state grooming or chained decisions better suited to be a series of true or false decisions that respectively continue or break the iteration.
```
var aLogic = DNode({ /**/ });
var bLogic = DNode({ /**/ });
var cTree = DTree({ /**/ });
var dFunc = function(o) { /**/ return o; };

var arrLogic = DNode([
  aLogic,
  bLogic,
  tree,
  func,
]); 
```
the above can be represented as:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex2.png" width="30%"><br>
  
  - ### DTree
This is a critical conception that allows easy composition: DNodes can be DTrees. 
This means that evaluating a DTree-like DNode is equivalent to traversing the tree and handling the returned global state within the calling/parent tree's recursion. 
```
var aTree = DTree({ /**/ });
var mainTree = DTree({
  root: {
    dnode: aTree,
    decisions: {
      true: /**/
      10: /**/
    }
});
```
The above can be visualized as follows:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex6.png" width="30%"><br>
  - ### Boolean or constant
Boolean evaluations or values are interpreted as keys. 
```
DNode(valueA === valueB || !valueC);
```
  - ### Neither a DNode or DTree
The value for a Dnode property in a tree can be a string, number, boolean or an instance of Function, the traversal tries to call it with `o` argument and expects a `o.key` as usual or simply ends the recursion and returns in its absence.

## Decision Graph
Self references to the root of the tree and even a path to a subtree are supported. This provides the potential for graph based decision modelling.
```
var Flow = DTree({
  Flow: {
    dnode: startLogic,
    decisions: {
      true: trueLogic,
      false: {
        dnode: falseLogic,
        decisions: {
          false: function(o) { o.key = 'fin'; return o; }
          loop: _DTree.prototype.treeSelf('Flow')
        }
    }
  }
});
```
the above can be represented as:
<br>
  <img src="https://raw.githubusercontent.com/filet-mign0n/filet-mignon.github.io/master/images/dflow_ex3.png" width="50%"><br>

## Todos
- implement promise-like behavior for async logic
- less hacky `treeSelf` reference method for graph
- better tracking for dnodes inside arrays
- perhaps move decision object inside DNode instance
