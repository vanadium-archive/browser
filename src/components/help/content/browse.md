In Browse mode, the left pane is used to browse the current namespace.

There are three views for browsing: Grid, Tree, and Visualize.
In any view, you can click on an item to show details in the right pane.

Grid View
---------

The Grid View is the default view.

![Grid View](helpimg/grid.png)

The breadcrumbs in the toolbar ("localhost:5167")
shows the name of the parent of these items.

This Grid View shows four items. Each item has an icon and a name:
* The icon for house and cottage show that they are mount tables.
* The icon for kitchen shows that it is a subtable
(a folder in a mount table).
* The icon for alarm shows that it is a service.

If an item is a mount table or a subtable, then it can have children.
If so, the item also has an action button on the right side to
browse those children. Services (like alarm) do not have children.

Tree View
---------

The Tree View browses a namespace as a rooted tree:

![Tree View](helpimg/tree.png)

Like the Grid View, each item contain an icon and a name.
The icon shows if the item is a mount table, subtable, or service.
As above, house is a mount table, kitchen is a subtable ,
and alarm is a service.

To the left of the item is a widget showing if the item has children.
Again, only mount tables and subtables can have children.

If no widget is shown, then the item has no children.
Because a namespace is often distributed across multiple computers,
it may take a moment before this widget appears.

If the widget contains a right-pointing arrow, then the item has children but
they are not shown. Click on the widget to expand the tree.

If the widget contains a down-pointing arrow, then the children are shown.
Again, because a namespace is distributed,
it may take a moment for all children to appear.
Click on the widget to collapse the sub-tree.

Radial View
--------------

The Radial View shows a namespace as a network graph with
nodes and edges.

![Radial View](helpimg/visualize.png)

You can select items to show details for that item (in the right pane).

You can drag the entire visualization around with your mouse,
or using the arrow keys on your keyboard.
You can zoom the entire visualization using the action buttons in
the upper left, using the "+" and "&minus;" keys on
your keyboard, or using the scroll wheel on your mouse.
You can rotate the entire visualization using the action buttons
in the upper left, using the "Page Up" and "Page Down" keys
on your keyboard, or by holding down the Shift key and using
the scroll wheel on your mouse.

You can reset the view using the Home key on your keyboard,
and you can center the currently selected item using the End
key on your keyboard.

The last action button loads an entire level of items, starting
from the currently selected item. You can also do this using
the Return key on your keyboard.

You can right click on any item to see a context menu for that item.
This menu allows you to expand or collapse the children of an item.
It also allows you to show all items that have already been loaded,
and make the currently selected node be the root of the visualization.
