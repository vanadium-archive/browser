The namespace browser is a tool to browse Vanadium namespaces
and interact with Vanadium services.
See the [Vanadium documentation](http://v.io) for more information.

Names
-----

Vanadium names identify objects in a namespace (similar to how URLs identify
objects on the web). In Vanadium, the objects are all *services* on *servers*.
See [the Naming concepts document](https://v.io/concepts/naming.html) for more information.

Names in Vanadium are a sequence of simple name components –
called *mounted names* – separated by slashes (/).
The process of using a Vanadium name to find a service on a server is
called *name resolution*. Names are resolved from left to right.
A name is resolved by special servers called *mount tables*,
and (optionally) by (all other) servers using something called a *dispatcher*.

For example, the Vanadium name `User/jane/images/vacation/42.jpg`
could be used to access a photo on an image storage server.
One or more mount tables would be traversed to find the `images` server,
whose dispatcher would then be used to find the `vacation` photo named `42.jpg`.
A *method* can then be called on this object; for example,
`User/jane/images/vacation/42.jpg.Get()` might return the image,
or `Delete()` might delete it.

Mount tables
------------

A *mount table* is a kind of Vanadium server used to find other services.
A mount table contains a set of *mount points*, which map names into distributed
pointers to other services (including to other mount tables).
An interconnected set of mount tables forms a Vanadium *namespace*.

Like other Vanadium servers, a mount table has a dispatcher that is
used to help resolve names. In the above example the name
`User/jane/images` may have been created in more than one way.

![Two mount tables](helpimg/name2.png)

In this figure `User` resolves to a mount table that
contains a mount point named `jane`. This mount point then points
to another mount table (possibly on another device)
that contains a mount point named `images`.

![Single mount table](helpimg/name1.png)

Alternatively, in this figure the `User` mount table contains a mount point named
`jane` that does not have a distributed pointer associated with it.
Such a name can point only to other mount points in the same mount table.
In this case, it points to a single name `images`, which does contain a
distributed pointer to the server.

One way to think about this second situation is that the mount point
named `jane/images` points directly to the image store server.
Even though the name `jane/images` contains a slash, it is resolved
by the mount table dispatcher to a single distributed pointer.

Another way to think about this is that a mount table can contain *subtables*,
so `User/jane` represents a subtable in the `User` mount table. These subtables
are used to group objects together (like directories in a file system on a computer).
For example, the User mount table could also contain `jane/movies`.

Note that even though Vanadium names look hierarchical, namespaces can
(and often do) contain cycles. A mount table could even contain a mount point
that points directly to the same mount table.
In addition, more than one mount point in different mount tables can point to
the same server (including to mount tables), so the same service can be accessed
via more than one name.

Rooted and relative names
-------------------------

Names in Vanadium can either be *rooted* or *relative*.
A rooted name begins with a slash (/), while a relative name does not.

Rooted names
------------

The name following the (required) initial slash of a rooted name is the *root*,
and always points to a service (often a mount table).
A root is specified in one of three ways:
1. using a (DNS) domain name (typically with an optional port number),
like "ns.dev.v.io:8101" or "localhost:5167",
2. using an IP address (also with an optional port number), like "127.0.0.1:5167"
(the IP address can use either IPv4 or IPv6 format),
3. or a Vanadium endpoint address for a mount table, which will look something like
"@3@@batman.com:2345@00000000000000000000000000000000@2@3@s@@".

Relative names
--------------

A relative name does not begin with a slash.
The meaning of a relative name depends on a root stored in the user's environment
(this is similar to the concept of a "current directory", except it can
be on a different device).

For example, each user can have their own mount table where they store things
they own. This mount table can contain names like "phone/messages" that
could be used to access the messages on their mobile phone.
Different users (or devices) would normally have a different default root,
so they would access their own messages.

Identity
--------

In Vanadium, mount tables (and thus names) are by default secure.
What names are accessible to a user depend on the identity of the user, and
the services (including mount tables) to which the user has been given access.

Help topics
-----------

* [What You See](#/help/views) –
the visible parts of the namespace browser and what they do.

* [Browse](#/help/browse) – how to browse a namespace,
including the different views provided by the namespace browser.

* [Details and Methods](#/help/methods) – how to find details, such as
permissions on names. For services, how to invoke methods.

* [Sample World](#/help/sample) – a sample namespace for you to
explore and manipulate.

* [FAQ](#/help/faq) – answers to frequently asked questions.
<p>&nbsp;</p>
