When you select an item in any of the Browse views (Grid, Tree, or Visualize),
details for that item appear in the right pane.

Intermediary Name
-----------------

The simplest kind of item is an intermediary name:

![Details for Intermediary name](helpimg/intermediary.png)

In the left pane, the intermediary name "kitchen" has been selected.

The right pane displays that the type is "Intermediary Name".
It also shows the item's full name from the root of this namespace.

Above the name, you can click on the bookmark icon to set a bookmark
for this item (kitchen).

Services
--------

The right pane is most useful for services.
Here is the right pane for the alarm service:

![Details for the Alarm service](helpimg/alarm.png)

As before, you can set a bookmark, and can see the full name and the type.
In addition, you can see what interfaces are supported by this service.

Most importantly the methods for the service are displayed.

Invoking Methods on Services
----------------------------

We can invoke methods on services to examine or change their state.
For example, if you want to run the "status()" method, click on the button
for the method (the green circle with a right arrow).
The method output (at the bottom) will say:

![Output from the status service](helpimg/output1.png)

Methods can also be used to change the state of the service.
For example, run the "arm()" service,
then run "status()" again. The method output now shows
that the alarm is armed:

![Output after arming alarm](helpimg/output2.png)

Some method calls take arguments. For example, the "delayArm(seconds float32)"
method takes a floating point number specifying the number of seconds
to delay before arming the alarm.

To specify the values of any arguments, click on the button (down arrow)
for the method, fill in values for the arguments, then click the RUN button.

The SAVE (star) button can be used to save a set of arguments for the function.
In addition, sets of arguments you have used to invoke the method will be
suggested in the future.

[TODO(wm): add images of this after it is reworked
 see  https://github.com/veyron/release-issues/issues/768]

[TODO(wm): mention tooltips on methods]

Mount Tables
------------

A mount table is also a service. The methods for a mount table allow you
to call methods on a mount table (e.g., to insert and delete items).
