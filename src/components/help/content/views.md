![The Namespace Browser](helpimg/views.png)

When you first open the namespace browser it has four main areas.
At the very top is the header and immediately below it is the toolbar.

In Browse mode, the remainder of the page is divided into two panes.
The left pane shows the view of the namespace for you to browse.
If you select an item in the left pane, the right pane shows details
about that item and (if it is a service) lets you call methods on it.

Header
------

![Header](helpimg/header.png)

Starting from the left, the header contains a widget
![menu icon](helpimg/menuicon.png)
to bring up a menu drawer for changing modes.
The current mode (in this case, Browse) is displayed next.
There are other modes for Help and submitting bugs and suggestions.
Additional modes are planned for the future.

In Browse mode, the header also shows the current Vanadium name being used
as the root of the namespace.
You can type an arbitrary Vanadium name into this field, select a name
using the "Bookmarks" or "Recent" views, select a breadcrumb, or use
the "Browse Into" widget in the item details. If this field is empty,
it defaults to the Home mount table for the current environment
(the root of relative names).

For example, type in "/ns.dev.v.io:8101/identity" to this field (and hit return)
to set the identity mount point to be the root of the currently browsed namespace.
Also clear out this field (and hit return) to see what happens.
Can you tell what your default root is for relative names?

The icon in front of this name
![reload icon](helpimg/reload.png)
is used to reload the name.
The Namespace Browser does not automatically update when namespaces
change (because they may be distributed across remote machines).

Finally, on the right side of the header is a widget
![user account](helpimg/usericon.png)
for the current identity.
Hover over this widget to see the account name for the current user.
This is by default the identity used to sign into the browser.

Toolbar
-------

![Toolbar](helpimg/toolbar.png)

The left side of the toolbar contains a list of (slash separated) names showing
what is being browsed, commonly called "breadcrumbs".
The breadcrumbs start at the root of the namespace, and end at the currently
selected node (if any).
A powerful feature of the Namespace browser is that you can click on any
name in the breadcrumbs to browse up and down the hierarchy.

Next there are three icons for the views shown in the left pane:
* Tree view shows items in a hierarchical tree.
* Radial view shows a visualization of the namespace,
good for getting an overview.
* Grid view shows items as individual objects.
<br /><br />

Next there are two icons for Bookmarks
![bookmarks](helpimg/bookmarks.png)
and Recent
![recent](helpimg/recent.png).

You can set a bookmark for any entry so you can access it quickly in the future.
When you select an entry (in the left pane),
you can set a bookmark on it by clicking the bookmark icon in the right pane.

Recent shows items you have browsed recently.

Lastly, you can use glob syntax to search for items.
For example, you are in a namespace that represents a house.
Under the house namespace are a number of rooms
(bedroom, kitchen, living room, etc.) and under each room are things like
lights, smoke detectors, thermostats, and speakers.
To search for the lights in all rooms, you could search for "*/lights".
Note that each glob (asterisk) only matches at a single level.
<p>&nbsp;</p>
