const path = require(`path`);
const fetch = require('isomorphic-fetch');
const gql = require('graphql-tag');
const ApolloBoost = require('apollo-boost');
const ApolloClient = ApolloBoost.default;

const client = new ApolloClient({
  uri: 'http://localhost:8080/v1/graphql',
  fetch,
});

const mutateQuery = gql`
  mutation upsert_article($objects: [article_insert_input!]!) {
    insert_article(
      objects: $objects,
      on_conflict: {
          constraint: article_pkey,
          update_columns: [slug],
      }
    ) {
      affected_rows
    }
  }
`;

exports.createPages = ({ actions, graphql }) => {
  const { createPage } = actions

  const blogPostTemplate = path.resolve(`src/templates/blogTemplate.js`)

  return graphql(`
    {
      allMarkdownRemark(
        sort: { order: DESC, fields: [frontmatter___date] }
        limit: 1000
      ) {
        edges {
          node {
            frontmatter {
              path
            }
          }
        }
      }
    }
  `).then(result => {
    if(result.data && process.env.NODE_ENV === 'production') {
      const edges = result.data.allMarkdownRemark.edges;
      const mutateObjects = [];
      edges.map((edge) => {
        const currentPath = edge.node.frontmatter.path;
        mutateObjects.push({slug: currentPath});
      })
      client.mutate({mutation: mutateQuery, variables: {objects: mutateObjects}})
      .then(result => { console.log(result) })
      .catch(error => { console.log(error) });
    }
    if (result.errors) {
      return Promise.reject(result.errors)
    }

    return result.data.allMarkdownRemark.edges.forEach(({ node }) => {
      createPage({
        path: node.frontmatter.path,
        component: blogPostTemplate,
        context: {}, // additional data can be passed via context
      })
    })
  })
}
