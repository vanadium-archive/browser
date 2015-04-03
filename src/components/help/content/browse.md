In Browse mode, the left pane is used to browse the current namespace.

There are three views for browsing: Tree, Grid, and Radial.
In any view, you can click on an item to show details in the right pane.

Tree View
---------

The Tree View browses a namespace as a hierarchy:

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

Grid View
---------

The Grid View show a set of items.
It is the default view for Bookmarks and Recent.

![Grid View](helpimg/grid.png)

The breadcrumbs in the toolbar ("localhost:5167")
shows the name of the parent of these items.

This Grid View shows four items. Each item has an icon and a name:
* The icon for house and cottage show that they are mount tables.
* The icon for kitchen shows that it is a subtable
(a folder in a mount table).
* The icon for alarm shows that it is a service.

Some items can have children. For example, mount tables can always
have children, and other services can be written to allow children
by extending the namespace.
If an item can have children, the item  has an action button on the right
side to browse those children.
Conversely, some services (like alarm) do not have children.

Radial View
--------------

The Radial View shows a namespace as a network graph with
nodes and edges.

![Radial View](helpimg/visualize.png)

An item in the namespace is represented by a circular node.
You can click on a node to select it,
which shows details for that item in the right pane.
If the circle has a solid center, then that item may have children.
You can double-click on the node to expand the children.

You can interact with the visualization using the widget buttons,
by right-clicking on a node to get a context menu,
or using keyboard shortcuts:

<style>
thead td { font-weight: bold; font-size: 1.1em; }
td.big { font-size: 1.2em; }
td:nth-child(1), td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: center; }
td:nth-child(5) { padding-left: 5px; }
</style>
<table>
  <thead>
    <tr><td>Widgets</td><td>Context menu</td><td>Keyboard shortcut</td><td>Other</td><td>Description</td></tr>
  </thead>
  <tr><td></td><td></td><td>Shift + arrow keys</td><td>click on node</td><td>select item</td></tr>
  <tr><td></td><td></td><td>arrow keys</td><td>drag with mouse</td><td>move visualization</tr>
  <tr><td class="big">+ &minus;</td><td></td><td>+ &minus;</td><td>mouse scrollwheel</td><td>zoom</td></tr>
  <tr><td class="big">&#8634; &#8635;</td><td></td><td>PageUp PageDown</td><td>Shift + scrollwheel</td><td>rotate</td></tr>
  <tr><td><img src="helpimg/unfold-more.png" style="border:none"></td><td>Load +1 Level</td><td>Return</td><td>Shift + double-click</td><td>load 1 additional level, from selection</tr>
  <tr><td></td><td>Expand/Collapse</td><td>space bar</td><td>double-click</td><td>expand/collapse immediate children</tr>
  <tr><td></td><td>Center Selected</td><td>End</td><td></td><td>center selected node</tr>
  <tr><td></td><td>Center Root</td><td>Home</td><td></td><td>reset rotate and zoom</td></tr>
  <tr><td></td><td>Show Loaded</td><td>Shift + Return</td><td></td><td>show all loaded children</tr>
  <tr><td></td><td>Browse Into</td><td>/</td><td>breadcrumbs</td><td>change root to selection</tr>
</table>

<br/>
For example, click on the <img src="helpimg/unfold-more.png" style="border:none">
widget to see additional levels in the namespace.
<p>&nbsp;</p>
