# DFlow

DFlow attempts to make an abstraction of flow-based programming through a decision tree. 
This decision tree is materialized as a javascript object that is visually intuitive, easily composable and fully controllable. 
The object's syntax can be seen as a mix of declarative and imperative programming. 

### DTree
```
var Flow = DTree({
  Flow: { 
    dnode: dLogic,
    decisions: {
      decision_key1: nextLogic,
      decision_key2: alternativeLogic
    }
  }
});
```  
### DNode
```
var dLogic = DNode(function dLogic(o) {
  if (o.kpi > 0.10) o.key = 'highPerformer';
  else o.key = 'lowPerformer';
});
```
