# JSON Diff Algorithm for EditorJS.

In EditorJS on save the whole object is provided and not changes. This is a problem
for update REST calls. As you need to pass the whole object and write into DB which is bad. 
This repo solves it by providing on the difference generated using Myer's algorithm with linear space.

Pass EditorJS data into it and it returns json-patch: like replace, add, delete.
Of the format as specified in the following link https://tools.ietf.org/html/rfc6902

For understanding the codebase refer to this link 
https://blog.jcoglan.com/2017/04/25/myers-diff-in-linear-space-implementation/
