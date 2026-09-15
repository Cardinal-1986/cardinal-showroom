(function(){
  'use strict';
  var OWNER='74ab4fdf-3e78-49a7-8e23-e841408a184d';
  window.CardinalWorkspace={
    enter:function(session){
      var section=document.getElementById('srWorkspace');
      if(section) section.hidden=!session || session.user.id!==OWNER;
    },
    leave:function(){
      var section=document.getElementById('srWorkspace');
      if(section) section.hidden=true;
      return fetch('/api/visual-library?action=session',{method:'DELETE'}).catch(function(){});
    }
  };
  if(window.currentUser) window.CardinalWorkspace.enter({user:window.currentUser});
})();
