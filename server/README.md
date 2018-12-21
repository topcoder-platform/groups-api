# New Groups API

The new Groups API

### Pagination
  Requests that return multiple items will be paginated to 20 items by default. You can specify
  further pages with the &#x60;page&#x60; parameter. You can also set a custom page
  size up to 100 with the &#x60;perPage&#x60; parameter.

  Pagination response data is included in http headers. By Default, the response header contains links with &#x60;next&#x60;, &#x60;last&#x60;, &#x60;first&#x60;, &#x60;prev&#x60; resource links.
