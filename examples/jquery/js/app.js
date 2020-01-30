/*global jQuery, Handlebars, Router */
document.addEventListener("DOMContentLoaded", function(){
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');

			var todoTemplateHtml = document.getElementById('todo-template').innerHTML
			this.todoTemplate = Handlebars.compile(todoTemplateHtml)
			
			var footerTemplateHtml = document.getElementById('footer-template').innerHTML
			this.footerTemplate = Handlebars.compile(footerTemplateHtml);

			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {
			// event listener -- keyup 
			document.addEventListener('keyup', function(e) {
				if(e.target.className === 'new-todo') {
					App.create.call(App, e)
				} else if(e.target.className === 'edit') {
					App.editKeyup.call(App, e)
				}
			})

			// event listener -- change
			document.addEventListener('change', function(e) {
				if(e.target.className === 'toggle-all') {
					App.toggleAll.call(App, e)
				} else if(e.target.className === 'toggle') {
					App.toggle.call(App, e)
				}
			})
			
			// event listener -- click
			document.addEventListener('click', function(e) {
				if(e.target.className === 'clear-completed') {
					App.destroyCompleted.call(App)
				} else if(e.target.className === 'destroy') {
					App.destroy.call(App, e)
				}
			})

			// event listener -- double click
			document.addEventListener('dblclick', function(e) {
				if(e.target.tagName === 'LABEL') {
					App.editingMode.call(App, e)
				}
			})

			// event listener -- focus out
			document.addEventListener('focusout', function(e) {
				if(e.target.className === 'edit') {
					App.update.call(App, e)
				}
			})
		},
		render: function () {
			var todos = this.getFilteredTodos();
			
			var todoListElement = document.getElementsByClassName('todo-list')[0]
			todoListElement.innerHTML = this.todoTemplate(todos) 
			
			var mainElem = document.getElementsByClassName('main')[0]

			// show/hide main section
			if(todos.length > 0) {
				mainElem.style.display = 'block'
			} else {
				mainElem.style.display = 'none'
			}

			// toggle all button styling
			var toggleAllElem = document.querySelector('.toggle-all')
		
			if(this.getActiveTodos().length === 0) {
				toggleAllElem.checked = true
			} else {
				toggleAllElem.checked = false
			}

			this.renderFooter();

			var newTodoElem = document.querySelector('.new-todo')
			newTodoElem.focus()

			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			var footerElem = document.querySelector('.footer')

			if(todoCount > 0) {
				footerElem.style.display = 'block'
			} else {
				footerElem.style.display = 'none'
			}
			
			footerElem.innerHTML = template

		},
		toggleAll: function (e) {
			var isChecked = e.target.checked

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		getIndexFromEl: function (el) {
			var id = el.closest('li').getAttribute('data-id')
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var input = e.target
			var val = input.value

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			input.value = ''
			
			this.render();
		},
		toggle: function (e) {
			var i = this.getIndexFromEl(e.target);
			this.todos[i].completed = !this.todos[i].completed;
			this.render();
		},
		editingMode: function (e) {
			var elem = (e.target).closest('li')
			elem.className += 'editing'

			var input = elem.querySelector('.edit')

			var tmpstr = input.value
			input.value = ''
			input.value = tmpstr
			input.focus()

		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				e.target.setAttribute('data-abort', true)
				e.target.blur()
			}
		},
		update: function (e) {
			var el = e.target;
			var val = el.value.trim()

			if (el.getAttribute('abort')) {
				el.setAttribute('abort', false);
			} else if (!val) {
				this.destroy(e);
				return;
			} else {
				this.todos[this.getIndexFromEl(el)].title = val;
			}
			this.render();
		},
		destroy: function (e) {
			this.todos.splice(this.getIndexFromEl(e.target), 1);
			this.render();
		}
	};

	App.init();
});
