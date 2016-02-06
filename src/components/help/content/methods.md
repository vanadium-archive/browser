When you select an item in any of the Browse views (Tree, Radial, or Grid),
details for that item appear in the right pane.
For the item named `applications`, the right pane has a header and
a set of tabs that look like this:

![Details header](helpimg/detailsheader.png)

On the left side between the header and the tabs is a widget
![hide](helpimg/hide.png) that hides the right pane.
You can also adjust the size of the right pane by dragging the
line that separates the left and right panes.

The header displays the mounted name of the selected item and two widgets:
![bookmark](helpimg/bookmark.png) to set a bookmark on the selected item, and
![browse into](helpimg/browseinto.png) to browse into the selected item
(make it the root of the current view).
If this item is already bookmarked, the bookmark widget looks like
![bookmarked](helpimg/bookmarked.png) and you can click on it to remove the bookmark.
When you browse into an item, the browse into widget changes to
![browse up](helpimg/revert.png), and you can click on it to undo
(revert the view back up to the previous item).

The `applications` item has two tabs, because it has a mount point and
it also points to a service.

MountPoint tab
--------------

The MountPoint tab shows details about the mount point associated
with this item:

![MountPoint details](helpimg/mountpoint.png)

The "Full Name" shows the full path used to access this item.
The "Mount Point Object Addresses" is a set of resolved names
for this item. This can be the same as the Full Name,
or can be multiple names.

"Permissions" shows all permissions set on this mount point.
Recall that an item can have permissions set on both the name,
and what the name points to.
See [the Security concepts document](https://vanadium.github.io/concepts/security.html)
for information about permissions.

Service tab
-----------

The Service tab shows details about the Vanadium service pointed to by this name:

![Service details](helpimg/service.png)

The "Full Name" shows the full path used to access this item
(same as in the MountPoint tab).
The "Service Object Addresses" is a set of resolved names
(object addresses) for the service pointed to by this item.
In this case it is a single endpoint.
The "Remote Blessings" is the security blessing the service
is running under.

Next is a set of interfaces that are supported by this service.
For each interface, the first line shows the name of the interface
(from the VDL file used to define the service),
an information widget
![information](helpimg/info.png),
and an arrow
![show/hide methods](helpimg/right.png)
to show or hide the methods associated with this interface.
Hover over the information widget to see the documentation for that
interface (from the source code).

Finally, for each interface you can invoke methods
to examine or change the state of the service,
and see output from method calls. If you have not called any methods,
then "Output" will show "No method output".

If the methods for an interface are showing, you can hover over the
method name to see the documentation for that method from the source code.
For example, here is the documentation for the Remove method of the
applications service:

![Remove method](helpimg/RemoveMethod.png)

All Vanadium services implement the "__Reserved" interface, which includes
methods for introspection and searching.
By default, the methods for this interface are not displayed,
but you can click the
![show methods](helpimg/right.png) icon to show (and even invoke) its methods.

Invoking methods on services
----------------------------

Each service has one or more methods associated with it.
You can call these methods if you have the proper permissions.
Here are the methods for the alarm service from the Sample World:

![Alarm methods](helpimg/alarm.png)

If a method does not take any arguments
(e.g., the Arm, Panic, Status and Unarm methods),
then you can invoke it by clicking on the
![No arguments](helpimg/noargs.png) icon.

For example, click on the
![No arguments](helpimg/noargs.png) icon for the
Status method, then the Arm method, and then the Status method again.
The Output will look like:

![Output](helpimg/output1.png)

This shows (from the bottom up) that the alarm is initially not armed,
until after you click on the Arm method.

Invoking methods with arguments
-------------------------------

If a method takes arguments, then the name of the method
is followed by "(...)" and you click on the
![arguments](helpimg/right.png) icon to supply the arguments.
For example, if you click on the icon for the DelayArm(...) method,
you get this:

![DelayArm method](helpimg/delayarm.png)

The documentation for the method is shown if you hover over the method.
This shows that the argument to DelayArm is a floating point number
that specifies a number of seconds to delay before arming the alarm.

Type the number 2 into the "seconds float(32)"" field and hit the "Run" button.
If the alarm is unarmed, after two seconds it will arm.

Arguments are remembered between calls, but
if you think you will call a method more than once with different sets of arguments,
you can also click the "Save" button. This saves the arguments like this:

![Save arguments](helpimg/savedarg.png)

Click the
![saved arguments](helpimg/noargs.png) icon to invoke the method with the
saved arguments. You can also click the star to delete these saved arguments.
You can create as many sets of saved arguments as you want for each method.
Also note that saved arguments carry over to other services of the
same type.

Mount tables as services
------------------------

A mount table is also a service. The methods for a mount table allow you
to call methods on a mount table (e.g., to Mount and Unmount items),
assuming you have the proper permissions on the mount table.
<p>&nbsp;</p>
