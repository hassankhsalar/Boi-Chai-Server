const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@boi-chai-db.9rtez.mongodb.net/?retryWrites=true&w=majority&appName=boi-chai-DB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
/////////////////////////////////////////////////////////////

//Books related APIs
const booksCollection = client.db('boi-chai').collection('books');
//general home page data
app.get('/books', async(req, res) => {
    const cursor = booksCollection.find();
    const result = await cursor.toArray();
    res.send(result);

})

//Specific book data
app.get('/books/:id', async(req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await booksCollection.findOne(query);
    res.send(result);
})



// Book data Update API
// Update book data in MongoDB
app.put('/books/:id', async (req, res) => {
    const { id } = req.params; // Extract the book ID from the URL
    const updatedBook = req.body; // Get the updated book data from the request body
  
    // Check if the provided ID is a valid MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ error: 'Invalid ID format' });
    }
  
    try {
      // Query to find the document by its ID
      const query = { _id: new ObjectId(id) };
  
      // Define the update document
      const updateDocument = {
        $set: {
          image: updatedBook.image,
          name: updatedBook.name,
          quantity: updatedBook.quantity,
          authorName: updatedBook.authorName,
          category: updatedBook.category,
          shortDescription: updatedBook.shortDescription,
          rating: updatedBook.rating,
        },
      };
  
      // Perform the update operation
      const result = await booksCollection.updateOne(query, updateDocument);
  
      // Handle cases where the document is not found
      if (result.matchedCount === 0) {
        return res.status(404).send({ error: 'Book not found' });
      }
  
      // Send a success response
      res.send({ message: 'Book updated successfully', result });
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  });
  
  







//////////////////////////////////////////////////////////////

  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);




app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('job is falling')
})

app.listen(port, () => {
    console.log(`job is waiting at: ${port}`)
})