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
* The icon for kitchen shows that it is an intermediary name
(a folder in a mount table).
* The icon for alarm shows that it is a service.

If an item is a mount table or an intermediary name, then it can have
children. If so, the item also has an action button on the right side
to browse those children. Services (like alarm) do not have children.

Tree View
---------

The Tree View a namespace as a rooted tree:

![Tree View](helpimg/tree.png)

Like the Grid View, each item contain an icon and a name.
The icon shows if the item is a mount table, intermediary name, or service.
As above, house is a mount table, kitchen is an intermediary name,
and alarm is a service.

To the left of the item is a widget showing if the item has children.
Again, only mount tables and intermediary names can have children.

If no widget is shown, then the item has no children.
Because a namespace is often distributed across multiple computers,
it may take a moment before this widget appears.

If the widget contains a plus sign, then the item has children but
they are not shown. Click on the widget to expand the tree.

If the widget contains a down-pointing arrow, then the children are shown.
Again, because a namespace is distributed,
it may take a moment for all children to appear.
Click on the widget to collapse the sub-tree.

Visualize View
--------------

The Visualize View shows a namespace as a network graph with
nodes and edges.

![Visualize View](helpimg/visualize.png)

You can drag items (nodes) around to rearrange the graph,
and can zoom in and out.
As in the other views, you can click on items to show details for that item
(in the right pane).
