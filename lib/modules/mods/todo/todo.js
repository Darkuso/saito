const util = require('util');
const ModTemplate = require('../../template');


//////////////////
// CONSTRUCTOR  //
//////////////////
function Todo(app) {

  if (!(this instanceof Todo)) { return new Todo(app); }

  Todo.super_.call(this);

  this.app             = app;

  this.tasks           = {};

  this.name            = "Todo";
  this.browser_active  = 1;
  this.handlesEmail    = 1;
  this.emailAppName    = "Todo";

  return this;

}
module.exports = Todo;
util.inherits(Todo, ModTemplate);


Todo.prototype.onConfirmation = function onConfirmation(blk, tx, conf, app) {
  if (conf == 0) {
    todo = app.modules.returnModule("Todo");
    switch (tx.transaction.msg.type) {
      case "task":
        todo.addTask(tx);
      case "checkbox":
        todo.toggleCheckbox(tx);
      default:
        break;
    }
  }
}

Todo.prototype.createTodoTX = function createTask(data) {
  var newtx = this.app.wallet.createUnsignedTransactionWithDefaultFee(this.app.wallet.returnPublicKey(), 0);

  newtx.transaction.msg = Object.assign({}, data, { module: "Todo" });

  if (newtx == null) { return null; }
  var newtx = this.app.wallet.signTransaction(newtx);

  this.app.network.propagateTransactionWithCallback(newtx, () => {
    if (this.app.BROWSER) {
      alert("your message was propagated")
    }
  })

  return newtx;
}

Todo.prototype.webServer = function webServer(app, expressapp) {
  expressapp.get('/todo/', (req, res) => {
    res.sendFile(__dirname + '/web/index.html');
    return;
  });
  expressapp.get('/todo/style.css', (req, res) => {
    res.sendFile(__dirname + '/web/style.css');
    return;
  });
}

Todo.prototype.attachEvents = function attachEvents(app) {
  if (!this.app.BROWSER) { return };

  var todo_self = this;

  $('#add_task_button').off();
  $('#add_task_button').on('click', () => {
    alert("You've clicked the button");

    let description = $('.submit_task').val();
    $('.submit_task').val("");

    if (description) {
      var task = {
        id: "",
        type: "task",
        description,
        completed: false
      }
    } else {
      alert("Please put something in the description box before submitting");
    }

    var task_tx = this.createTodoTX(task);

    if (!task_tx) {
      alert("You don't have enough funds to post this");
    }

    this.addTask(task_tx);
  });

  $('input:checkbox').off();
  $('input:checkbox').on('click', function() {
    var checkbox = {
      id: this.id,
      type: "checkbox",
      completed: this.checked
    }

    var checkbox_tx = todo_self.createTodoTX(checkbox);

    if (!checkbox_tx) {
      alert("You don't have enough funds to post this");
    }
  });
}

Todo.prototype.addTask = function addTask(task_tx) {
  if (this.tasks[task_tx.transaction.sig]) { return; }

  var newTask = `
  <div class="task_container">
    <input type="checkbox" class="task_checkbox" id="${task_tx.transaction.sig}">
    <div class="task" id="task_${task_tx.transaction.sig}">${task_tx.transaction.msg.description}</div>
  </div>
  `
  $('.todoList').append(newTask);

  this.tasks[task_tx.transaction.sig] = 1;

  this.attachEvents(this.app);
}

Todo.prototype.toggleCheckbox = function toggleCheckbox(checkbox_tx) {
  var {id, completed} = checkbox_tx.transaction.msg;
  $(`#${id}`).prop('checked', completed);
}