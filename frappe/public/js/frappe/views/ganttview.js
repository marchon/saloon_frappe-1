// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide("frappe.views.calendar");

frappe.views.GanttFactory = frappe.views.Factory.extend({
	make: function(route) {
		var me = this;

		frappe.require('assets/frappe/js/lib/jQuery.Gantt/css/style.css');
		frappe.require('assets/frappe/js/lib/jQuery.Gantt/js/jquery.fn.gantt.js');

		this.doctype = route[1];

		frappe.model.with_doctype(this.doctype, function() {
			var page = me.make_page();
			$(page).on("show", function() {
				page.ganttview.set_filters_from_route_options();
			});

			var options = {
				doctype: me.doctype,
				parent: page
			};
			$.extend(options, frappe.views.calendar[me.doctype] || {});

			page.ganttview = new frappe.views.Gantt(options);
		});
	}
});

frappe.views.Gantt = frappe.views.CalendarBase.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make_page();
		frappe.route_options ?
			this.set_filters_from_route_options() :
			this.refresh();
	},
	make_page: function() {
		var module = locals.DocType[this.doctype].module,
			me = this;

		this.page = this.parent.page;
		this.page.set_title(__("Gantt Chart") + " - " + __(this.doctype));
		frappe.breadcrumbs.add(module, this.doctype);

		this.page.set_secondary_action(__("Refresh"),
			function() { me.refresh(); }, "icon-refresh")

		this.page.add_field({fieldtype:"Date", label:"From",
			fieldname:"start", "default": frappe.datetime.month_start(),
			change: function() { me.refresh(); },
			input_css: {"z-index": 3}});

		this.page.add_field({fieldtype:"Date", label:"To",
			fieldname:"end", "default": frappe.datetime.month_end(),
			change: function() { me.refresh(); },
			input_css: {"z-index": 3}});

		this.add_filters();
		this.wrapper = $("<div style='position:relative;z-index:1;'></div>").appendTo(this.page.main);

	},
	refresh: function() {
		var me = this;
		var filters = me.get_filters()

		if (me.doctype=="Appointment" && filters["employee"]){
			return frappe.call({
				method: "erpnext.crm.doctype.appointment.appointment.get_filter_event",
				args: {
					start: this.page.fields_dict.start.get_parsed_value(),
					end: this.page.fields_dict.end.get_parsed_value(),
					filters: this.get_filters()
				},
				callback: function(r) {
					$(me.wrapper).empty();
					if(!r.message || !r.message.length) {
						$(me.wrapper).html('<p class="text-muted" style="padding: 15px;">' + __('Nothing to show for this selection') + '</p>');
					}
					else {
						var gantt_area = $('<div class="gantt">').appendTo(me.wrapper);
						gantt_area.gantt({
							source: me.get_appointment(r),
							navigate: "scroll",
							scale: "hours",
							minScale: "hours",
							maxScale: "months",
							itemsPerPage: 20,
							onItemClick: function(data) {
								frappe.set_route('Form', me.doctype, data.name);
							},
							onAddClick: function(dt, rowId) {
								newdoc(me.doctype);
							}
						});
					}
				}
			})
		}
		else if (me.doctype=="Appointment" && !(filters["employee"])){
			return frappe.call({
				method: this.get_events_method,
				type: "GET",
				args: {
					doctype: this.doctype,
					start: this.page.fields_dict.start.get_parsed_value(),
					end: this.page.fields_dict.end.get_parsed_value(),
					filters: this.get_filters()
				},
				callback: function(r) {
					$(me.wrapper).empty();
					if(!r.message || !r.message.length) {
						$(me.wrapper).html('<p class="text-muted" style="padding: 15px;">' + __('Nothing to show for this selection') + '</p>');
					}
					else {
						var gantt_area = $('<div class="gantt">').appendTo(me.wrapper);
						gantt_area.gantt({
							source: me.get_appointment(r),
							navigate: "scroll",
							scale: "hours",
							minScale: "hours",
							maxScale: "months",
							itemsPerPage: 20,
							onItemClick: function(data) {
								frappe.set_route('Form', me.doctype, data.name);
							},
							onAddClick: function(dt, rowId) {
								newdoc(me.doctype);
							}
						});
					}
				}
			})
		}
		else {
			return frappe.call({
				method: this.get_events_method,
				type: "GET",
				args: {
					doctype: this.doctype,
					start: this.page.fields_dict.start.get_parsed_value(),
					end: this.page.fields_dict.end.get_parsed_value(),
					filters: this.get_filters()
				},
				callback: function(r) {
					$(me.wrapper).empty();
					if(!r.message || !r.message.length) {
						$(me.wrapper).html('<p class="text-muted" style="padding: 15px;">' + __('Nothing to show for this selection') + '</p>');
					}
					else {
						var gantt_area = $('<div class="gantt">').appendTo(me.wrapper);
						gantt_area.gantt({
							source: me.get_source(r),
							navigate: "scroll",
							scale: "days",
							minScale: "hours",
							maxScale: "months",
							itemsPerPage: 20,
							onItemClick: function(data) {
								frappe.set_route('Form', me.doctype, data.name);
							},
							onAddClick: function(dt, rowId) {
								newdoc(me.doctype);
							}
						});
					}
				}
			})
		}
	},
	get_source: function(r) {
		var source = [],
			me = this;
		// projects
		$.each(r.message, function(i,v) {
			v["title"] = v[me.field_map["title"]];

			// description
			v.desc = v.title
				+ (v.name ? ("<br>" + v.name) : "");

			$.each(v, function(key, value) {
				if(!in_list(["name", "title", me.field_map["title"], "desc"], key) && value) {
					var label = frappe.meta.get_label(me.doctype, key);
					if(label) {
						v.desc += "<br>" + label + ": " + value;
					}
				}
			});

			// standardize values
			$.each(me.field_map, function(target, source) {
				v[target] = v[source];
			});

			if(v.start && !v.end) {
				v.end = new Date(v.start)
				v.end.setHours(v.end.getHours() + 1);
			}

			// class
			if(me.style_map) {
				v.cssClass = me.style_map[v.status]
			} else if(me.get_css_class) {
				v.cssClass = me.get_css_class(v);
			} else {
				v.cssClass = frappe.utils.guess_style(v.status, "standard")
			}

			if(v.start && v.end) {
				source.push({
					name: v.title,
					desc: v.status,
					values: [{
						name: v.title,
						desc: v.desc,
						from: '/Date('+moment(v.start).format("X")+'000)/',
						to: '/Date('+moment(v.end).format("X")+'000)/',
						customClass: {
							'danger':'ganttRed',
							'warning':'ganttOrange',
							'info':'ganttBlue',
							'success':'ganttGreen',
							'':'ganttGray'
						}[v.cssClass],
						dataObj: v
					}]
				})
			}
		});
		return source
	},

	get_appointment: function(r) {
		var source = [],
			me = this;
		filters = me.get_filters()

		if (filters["employee"]){
			$.each(r.message, function(i,v) {
				// console.log(v["name"])
				v["title"] = v[me.field_map["title"]];

			// description
				v.desc = v.title
				// 	+ (v.name ? ("<br>" + v.name) : "");

				$.each(v, function(key, value) {
					if(!in_list(["name", "title", me.field_map["title"], "desc"], key) && value) {
						var label = frappe.meta.get_label(me.doctype, key);
						if(label) {
							v.desc += "<br>" + label + ": " + value;
						}
					}
				});

				// standardize values
				$.each(me.field_map, function(target, source) {
					v[target] = v[source];
				});

				if(v.start && !v.end) {
					v.end = new Date(v.start)
					v.end.setHours(v.end.getHours() + 1);
				}

				// class
				if(me.style_map) {
					v.cssClass = me.style_map[v.status]
				} else if(me.get_css_class) {
					v.cssClass = me.get_css_class(v);
				} else {
					v.cssClass = frappe.utils.guess_style(v.status, "standard")
				}

				if(v.start && v.end) {
					source.push({
						name: v.title,
						desc: v.status,
						values: [{
							name: v.title,
							desc: v.desc,
							label: v["name"],
							from: '/Date('+moment(v.start).format("X")+'000)/',
							to: '/Date('+moment(v.end).format("X")+'000)/',
							customClass: {
								'danger':'ganttRed',
								'warning':'ganttOrange',
								'info':'ganttBlue',
								'success':'ganttGreen',
								'':'ganttGray'
							}[v.cssClass],
							dataObj: v
						}]
					})
				}
			});
		}

		else{
			$.each(r.message, function(i,v) {
				var value = []
				frappe.call({
					method: "erpnext.crm.doctype.appointment.appointment.get_appointment_records",
					args: {
						emp: v["name"],
						start: me.page.fields_dict.start.get_parsed_value(),
						end: me.page.fields_dict.end.get_parsed_value()
					},
					callback: function(r) {
						$.each(r.message, function(i,n) {
							n["title"] = n[me.field_map["title"]];

							// description
							n.desc = n.title
								// + (n.name ? ("<br>" + n.name) : "");

							$.each(n, function(key, value) {
								if(!in_list(["name", "title", me.field_map["title"], "desc"], key) && value) {
									var label = frappe.meta.get_label(me.doctype, key);
									if(label) {
										n.desc += "<br>" + label + ": " + value;
									}
								}
							});

							// standardize values
							$.each(me.field_map, function(target, source) {
								n[target] = n[source];
							});

							if(n.start && !n.end) {
								n.end = new Date(n.start)
								n.end.setHours(n.end.getHours() + 1);
							}

							// class
							if(me.style_map) {
								n.cssClass = me.style_map[n.status]
							} else if(me.get_css_class) {
								n.cssClass = me.get_css_class(n);
							} else {
								n.cssClass = frappe.utils.guess_style(n.status, "standard")
							}

							if(n.start && n.end && n.title == v["name"]) {
								value = value.concat(
									[{
										name: n.title,
										desc: n.desc,
										label: n["name"],
										from: '/Date('+moment(n.start).format("X")+'000)/',
										to: '/Date('+moment(n.end).format("X")+'000)/',
										customClass: {
											'danger':'ganttRed',
											'warning':'ganttOrange',
											'info':'ganttBlue',
											'success':'ganttGreen',
											'':'ganttGray'
										}[n.cssClass],
										dataObj: n
									}]
								)
							}
						});
						source.push({
							name: v["name"],
							values: value
						})
					}
				});
			});
		}
		return source
	}
});
