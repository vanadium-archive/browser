In Browse mode, the left pane is used to browse the current namespace.

There are three views for browsing: Tree, Radial and Grid.
As discussed in the [Overview and Concepts](#/help/main) tab,
a Vanadium name consists of a list of mounted names separated by slashes.
All views show a set of *items*, and in all views each item includes a
mounted name and an icon.

Item Icons
----------

If the icon for an item is a square
<img src="helpimg/square.png" style="border:none" />,
then the item represents a mount point in a mount table.
If the icon is a circle
<img src="helpimg/circle.png" style="border:none" />,
then the item points at a service.
If the icon includes both a square and a circle
<img src="helpimg/squarecircle.png" style="border:none" />,
then the name both represents a mount point and it also points at a service.
If the namespace browser cannot access the name
(typically because of permissions), then the icon indicates an error
<img src="helpimg/inaccessible.png" style="border:none" />.

Put another way, the mount point represents the mounted name itself,
and the service represents what the name points to.
This is significant because permissions (such as Access Control Lists)
can be set both on names (mount points) and on services.

In any view, you can select an item to show details for it in the right pane.
The right pane will contain one or two tabs, depending on whether the selected
item represents a mount point, has a pointer to a service, or both.

Tree View
---------

The Tree View browses a namespace as a hierarchy.
The tree view shows each item on a separate line.
Each item consists of an arrow, an icon, and a mounted name.

![Tree View](helpimg/tree.png)

The arrow is used to expand and collapse the children of the item.
It will only appear if an item can have children,
but will appear even if the item currently does not have any children
(or only has children that the current user does not have permission to view).
Click on a right-pointing arrow to expand its children.

Because an item's children may be distributed across multiple devices,
it may take a moment before the children appear.
A loading icon is shown circling the arrow while children are still loading.

The icon is discussed above.

Radial View
--------------

The Radial View browses a namespace as items radiating out from the root,
using a circular network graph with nodes and edges.
The nodes are shown as the icons for each item (square and/or circle).
The edges are shown as curved lines.

![Radial View](helpimg/radial.png)

You can click on a node to select it.
You can double-click on the node to expand its children (if any).
You can expand a whole level of the graph (children, grandchildren, etc.)
by clicking repeatedly on the expand widget
<img src="helpimg/unfold-more.png" style="border:none" />.
The node blinks while children are loading.

You can interact with the visualization using the five widget buttons,
by right-clicking on a node to see a context menu,
or using keyboard shortcuts:

<style>
thead td { font-weight: bold; font-size: 1.1em; border-bottom: solid gray 1px; }
table tr:nth-child(even) { background-color: rgba(220, 220, 220, 0.8); }
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
  <tr><td></td><td>Browse Into</td><td>/</td><td>breadcrumbs</td><td>change current root to selection</tr>
</table>

Grid View
---------

The Grid View shows a set of items, typically the children of an item.

![Grid View](helpimg/grid.png)

The blue name (`identity`) is the parent of the items.

Unlike the tree view, in the grid view the arrow is shown on the right
side of the item.
If an item does not include an arrow, then it cannot have children.

Click on the arrow for an item to show its children (if any),
or click on the "browse into" widget
![Browse Into](helpimg/browseInto.png) in the right pane to display
the children of the currently selected item.
You can also use the breadcrumbs to move up and down the hierarchy.

Grid View is also used for Bookmarks and Recent, and to show the results
of a search.
<p>&nbsp;</p>
