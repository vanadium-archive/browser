When you select an item in any of the Browse views (Tree, Grid, or Radial),
details for that item appear in the right pane.

Subtable
-----------------

The simplest kind of item is a subtable:

![Details for Subtable](helpimg/subtable.png)

In the left pane, the subtable "kitchen" has been selected.

The right pane displays that the type is "Subtable".
It also shows the item's full name from the root of this namespace.

Above the name, you can click on the bookmark icon to set a bookmark
for this item (kitchen), or can click to set this item to be
the new root for browsing.

Services
--------

The right pane is most useful for services.
Here is the right pane for the alarm service:

![Details for the Alarm service](helpimg/alarm.png)

As before, you can set a bookmark. But in the figure above,
the alarm service already has already been bookmarked
(the bookmark icon is solid purple).
Click it again to remove the bookmark.

Below the full name and the type, you can see what Vanadium
endpoints point to this service,
and what interfaces are supported by this service.

Most importantly, the methods for the service are displayed.
Hover over a method name to see more information about the method.
If a method takes arguments, then the name of the method
is followed by "(...)".

Invoking Methods on Services
----------------------------

We can invoke methods on services to examine or change their state.
For example, if you want to run the "status" method, click on the button
for the method (the circle containing a right arrow).
The method output (at the bottom) will say:

![Output from the status service](helpimg/output1.png)

Methods can also be used to change the state of the service.
For example, run the "arm()" service,
then run "status()" again. The method output now shows
that the alarm is armed:

![Output after arming alarm](helpimg/output2.png)

Invoking Methods with Arguments
-------------------------------

Some method calls take arguments. For example, "delayArm(...)".
Clicking on the action button (down arrow) for this method
allows you to see more information about the arguments.

![delayArm arguments](helpimg/delayarm.png)

The delayArm method takes a floating point number specifying the number of seconds
to delay before arming the alarm.

In this case, the namespace browser is recommends a value of 1
(the item beginning with a star).
You can click the action button (circle containing a right arrow)
for this recommendation to run it.

Alternatively, you can specify a different value by typing it into the line
that contains "seconds (float32)", which is the type of the argument.
Then click the RUN button to execute the method.

The SAVE (star) button can be used to save a set of arguments for the function.
In addition, sets of arguments you have used to invoke the method will be
recommended in the future.

Mount Tables as Services
------------------------

A mount table is also a service. The methods for a mount table allow you
to call methods on a mount table (e.g., to insert and delete items).
<p>&nbsp;</p>
