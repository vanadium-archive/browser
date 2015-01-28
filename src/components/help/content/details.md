![Viz](helpimg/viz.png)

When you first open Viz it has four main areas.
At the very top is the header and immediately below it is the toolbar.

In Browse mode, the rest of the page is divided into two panes.
The left pane shows the view of the namespace for you to browse.
If you select an item in left pane, the right pane shows details
about that item and (if it is a service) lets you call methods on it.

Header
------

![Header](helpimg/header.png)

Starting from the left, the header contains an icon to bring up a menu
for changing modes.
The current mode (in this case, Browse) is displayed next.
There are other modes for Help and submitting bugs and suggestions.
Additional modes are planned for the future.

In Browse mode, the header also shows the current Vanadium name being used
as the root of the namespace.
This can be a mount table or an intermediary name in a mount table.
You can type a Vanadium name into this field, or you can select a name
using the Bookmarks or Recommendations tools. If this field is empty,
it defaults to the Home mount table for the current environment.

For example, type in "/localhost:5167/house" to this field to set the
mount table for the house to be the root of the currently browsed namespace.

Finally, on the right side of the header the current identity is displayed.
This is initially the identity used to sign into the browser.

Toolbar
-------

![Toolbar](helpimg/toolbar.png)

The left side of the toolbar contains a list of (slash separated) names showing
what is being browsed (commonly called "breadcrumbs").
Initially, this is the same as the root.
You can click on any name to go up the hierarchy.

Next there are three icons for the views shown in the left pane:
* Grid view shows items as individual objects.
* Tree view shows items in a tree, starting from the root.
* Visualize view shows a dynamic visualization of a namespace.
<br /><br />

Next there are two icons for Bookmarks and Recommendations.

You can set a bookmark for any entry so you can access it quickly in the future.
When you select an entry (in the left pane),
you can set a bookmark on it by clicking the bookmark icon in the right pane.

Recommendations uses machine intelligence to suggest interesting items.

Lastly, you can use glob syntax to search for items.
For example, you are in a namespace that represents a house.
Under the house namespace are a number of rooms
(bedroom, kitchen, living room, etc.) and under each room are things like
lights, smoke detectors, thermostats, and speakers.
To search for the lights in all rooms, you could search for "*/lights".
Note that currently you can search only at a single level.
