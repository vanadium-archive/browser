Introduction
------------

The Viz Vanadium Viewer is a tool to browse and interact with Vanadium services.
See the Vanadium documentation for more information.

Mount Tables
------------

One special kind of Vanadium service is a *mount table*, which contains
distributed pointers to other services (including other mount tables).

Each entry in a mount table can be one of three things:
* a distributed pointer to another mount table
* a distributed pointer to a Vanadium service (other than a mount table)
* a folder

Folders are used to group entries together, like in a file system
on a computer.
The name used to identify a folder is called an "intermediary name" (like
a directory name). Folders in a mount table can only contain other entries
in the same mount table.

Namespaces
----------

An interconnected set of mount tables forms a Vanadium *namespace*.

Vanadium uses namespaces to find things (services), similar to how the WWW
uses URLs to find things (web pages).
However, URLs are global names that are strictly hierarchical and must be
globally unique,
while names in Vanadium are distributed and need not be unique.

Relative Names
--------------

In addition, names are not strictly hierarchical,
so a namespace can contain cycles.
Consequently, what a name means changes depending on what is used as the root
of the name.
Any mount table in a namespace can be used as the root of a name.

For example, a user can have their own mount table where they store things
they own. This mount table can contain names like "phone/messages" that
could be used to access the messages on their mobile phone.

Identity
--------

In Vanadium, mount tables (and thus names) are secure.
What names are accessible to a user depend on the identity of the user, and
the services (including mount tables) to which the user has been given access.


Help Topics
-----------

* [What You See](#/help/details) – the different parts of Viz and what they do.

* [Browse](#/help/browse) – how to use Viz to browse a namespace,
including the different views provided by Viz.

* [Invoking Services](#/help/methods) – once you browse to a service,
how to invoke methods.

* [FAQ](#/help/faq) – answers to frequently asked questions.
