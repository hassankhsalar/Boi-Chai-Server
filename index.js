const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {
  console.log('inside the verify token middleware')
  const token = req.cookies?.token;

  if(!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@boi-chai-db.9rtez.mongodb.net/?retryWrites=true&w=majority&appName=boi-chai-DB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function updateQuantities() {
  try {
    const booksCollection = client.db('boi-chai').collection('books');
    const result = await booksCollection.updateMany(
      { quantity: { $type: "string" } },  // Find documents where quantity is a string
      [{ $set: { quantity: { $toInt: "$quantity" } } }]  // Convert quantity to integer
    );

    console.log(`${result.modifiedCount} documents updated.`);
  } catch (error) {
    console.error('Error updating quantities:', error);
  }
}

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Call updateQuantities to ensure all quantities are numeric
    await updateQuantities();

    ///////////////////////////////////////////////////////////////

    // Books related APIs
    const booksCollection = client.db('boi-chai').collection('books');

    // Fetch all books or filter by category
    app.get('/books', async (req, res) => {
      const { category } = req.query; // Get the category from query parameters
      try {
        const query = category ? { category } : {}; // Create a query object
        const cursor = booksCollection.find(query); // Use the query object to find documents
        const result = await cursor.toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to fetch books' });
      }
    });

    // Specific book data
    app.get('/books/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booksCollection.findOne(query);
      res.send(result);
    });

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

    // Borrowed book related API
    // Borrow a book
    const borrowedBooksCollection = client.db('boi-chai').collection('borrowedBooks');
    app.post('/borrow', async (req, res) => {
      try {
        const { bookId, returnDate, user, image } = req.body;

        // Find the book by ID
        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        if (!book) {
          return res.status(404).json({ message: 'Book not found' });
        }

        // Check if the quantity is sufficient
        if (book.quantity <= 0) {
          return res.status(400).json({ message: 'Book out of stock' });
        }

        // Add the borrowed book to the borrowedBooks collection
        await borrowedBooksCollection.insertOne({
          bookId: new ObjectId(bookId),
          name: book.name,
          user,
          returnDate,
          borrowedOn: new Date(),
          image,
        });

        // Update the book's quantity
        await booksCollection.updateOne(
          { _id: new ObjectId(bookId) },
          { $inc: { quantity: -1 } }
        );

        res.status(200).json({ message: 'Book borrowed successfully' });
      } catch (error) {
        console.error('Error in /borrow endpoint:', error); // Detailed error logging
        res.status(500).json({ message: 'Failed to borrow book', error: error.message });
      }
    });

    // Update book quantity in MongoDB
    app.patch('/books/:id', async (req, res) => {
      const { id } = req.params; // Extract the book ID from the URL
      const { quantity } = req.body; // Get the updated quantity from the request body

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
            quantity: quantity, // Update the quantity
          },
        };

        // Perform the update operation
        const result = await booksCollection.updateOne(query, updateDocument);

        // Handle cases where the document is not found
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: 'Book not found' });
        }

        // Send a success response
        res.send({ message: 'Book quantity updated successfully', result });
      } catch (error) {
        console.error('Error updating book quantity:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });


    //show borrowed books
    // Fetch borrowed books by user email
    app.get('/borrowedBooks', verifyToken, async (req, res) => {
    const { email } = req.query; // Get email from query parameters
    console.log('cuk cuk cookies');
    if(req.user.email !== req.query.email){
      return res.status(403).send({ message: 'Forbidden access' })
    }
    try {
      const borrowedBooks = await borrowedBooksCollection.find({ 'user.email': email }).toArray();
      res.status(200).json(borrowedBooks);
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      res.status(500).json({ message: 'Failed to fetch borrowed books' });
    }
  });

      //delete from borrowed list
      app.delete('/borrowedBooks/:id', async (req, res) => {
        const { id } = req.params;
        const { userEmail } = req.body; // Ensure correct key is used
      
        try {
          
          // Remove the book from the borrowedBooks collection
          await borrowedBooksCollection.deleteOne({
            bookId: new ObjectId(id), // Convert to ObjectId if necessary
            'user.email': userEmail, // Ensure this matches your DB field structure
          });
      
          // Increase the book's quantity in the books collection
          await booksCollection.updateOne(
            { _id: new ObjectId(id) }, // Ensure correct field for matching
            { $inc: { quantity: 1 } }
          );
      
          res.status(200).json({ message: 'Book returned successfully' });
        } catch (error) {
          console.error('Error returning book:', error);
          res.status(500).json({ message: 'Failed to return book' });
        }
      });

    // User Related APIs
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

    // Get User image in the navbar
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

    // API to get logged-in user's information
    app.get('/users', async (req, res) => {
      try {
        const email = req.query.email; // Extract the email from the query parameter
        if (!email) {
          return res.status(400).json({ error: 'Email is required to fetch user data' });
        }

        // Query the database for the user with the given email
        const user = await usersCollection.findOne({ email });
        if (user) {
          res.status(200).json(user);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
      }
    });

    //////////////////////////////////////////////

    //Auth related APIs
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {expiresIn: '1h'});
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: false,

      })
      .send({success: true});
    })

    ///////////////////////////////////////////////////////////////

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('job is falling');
});

app.listen(port, () => {
  console.log(`job is waiting at: ${port}`);
});
