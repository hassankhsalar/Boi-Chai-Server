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

// POST: Add a New Book
app.post('/books', async (req, res) => {
    try {
      const newBook = req.body;

      // Validation (optional)
      if (
        !newBook.image ||
        !newBook.name ||
        !newBook.quantity ||
        !newBook.authorName ||
        !newBook.category ||
        !newBook.shortDescription ||
        !newBook.rating
      ) {
        return res.status(400).send({ error: 'All fields are required' });
      }

      // Insert into the database
      const result = await booksCollection.insertOne(newBook);
      res.status(201).send({ success: true, message: 'Book added successfully', result });
    } catch (error) {
      res.status(500).send({ error: 'Failed to add book' });
    }
  });


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
  
  //User Related APIs
  const usersCollection = client.db('boi-chai').collection('users');

  // POST: Register a New User
app.post('/register', async (req, res) => {
    try {
      const { name, email, photoURL } = req.body;
  
      // Validation: Check if all fields are provided
      if (!name || !email || !photoURL) {
        return res.status(400).send({ error: 'All fields (name, email, photoURL) are required' });
      }
  
      // Check if the user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).send({ error: 'User already exists' });
      }
  
      // Insert the new user into the database
      const newUser = { name, email, photoURL };
      const result = await usersCollection.insertOne(newUser);
  
      res.status(201).send({
        success: true,
        message: 'User registered successfully',
        result,
      });
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).send({ error: 'Internal Server Error' });
    }
  });

  //Get User image in the navbar
  app.get('/users/:email', async (req, res) => {
    const email = req.params.email;
    try {
      const user = await client.db('boi-chai').collection('users').findOne({ email });
      if (user) {
        res.send(user);
      } else {
        res.status(404).send({ error: 'User not found' });
      }
    } catch (error) {
      res.status(500).send({ error: 'Failed to fetch user' });
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