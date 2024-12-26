const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const port = process.env.port || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors({
  origin: [
    'https://boi-chai-3669a.web.app',
    'https://boi-chai-3669a.firebaseapp.com',
    'http://localhost:5173'
  ],
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
      { quantity: { $type: "string" } },  
      [{ $set: { quantity: { $toInt: "$quantity" } } }]  
    );

    console.log(`${result.modifiedCount} documents updated.`);
  } catch (error) {
    console.error('Error updating quantities:', error);
  }
}

async function run() {
  try {
    // Connect the client to the server
    //await client.connect();
    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    //console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Call updateQuantities to ensure all quantities are numeric
    await updateQuantities();

    ///////////////////////////////////////////////////////////////

    // Books related APIs
    const booksCollection = client.db('boi-chai').collection('books');

    // Fetch all books or filter by category
    app.get('/books', async (req, res) => {
      const { category } = req.query; 
      try {
        const query = category ? { category } : {}; 
        const cursor = booksCollection.find(query); 
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
      const { id } = req.params; 
      const updatedBook = req.body; 
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
      }

      try {
        const query = { _id: new ObjectId(id) };

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

        const result = await booksCollection.updateOne(query, updateDocument);

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: 'Book not found' });
        }

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

        const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
        if (!book) {
          return res.status(404).json({ message: 'Book not found' });
        }

        if (book.quantity <= 0) {
          return res.status(400).json({ message: 'Book out of stock' });
        }

        await borrowedBooksCollection.insertOne({
          bookId: new ObjectId(bookId),
          name: book.name,
          user,
          returnDate,
          borrowedOn: new Date(),
          image,
        });

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

    app.patch('/books/:id', async (req, res) => {
      const { id } = req.params; 
      const { quantity } = req.body; 

      
      if (!ObjectId.isValid(id)) {
        return res.status(400).send({ error: 'Invalid ID format' });
      }

      try {
        
        const query = { _id: new ObjectId(id) };

        const updateDocument = {
          $set: {
            quantity: quantity, 
          },
        };

        const result = await booksCollection.updateOne(query, updateDocument);

        if (result.matchedCount === 0) {
          return res.status(404).send({ error: 'Book not found' });
        }

        res.send({ message: 'Book quantity updated successfully', result });
      } catch (error) {
        console.error('Error updating book quantity:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });


    //show borrowed books
    // Fetch borrowed books by user email
    app.get('/borrowedBooks', verifyToken, async (req, res) => {
    const { email } = req.query; 
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
        const { userEmail } = req.body; 
      
        try {
          
          await borrowedBooksCollection.deleteOne({
            bookId: new ObjectId(id), 
            'user.email': userEmail, 
          });
      
          // Increase the book's quantity in the books collection
          await booksCollection.updateOne(
            { _id: new ObjectId(id) }, 
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

    //registering new user
    app.post('/users', async (req, res) => {
      const { email, name, photoURL } = req.body;
  
      if (!email || !name) {
          return res.status(400).json({ error: 'Email and name are required.' });
      }
  
      try {
          const existingUser = await usersCollection.findOne({ email });
  
          if (existingUser) {
              return res.status(409).json({ message: 'User already exists.' });
          }
  
          const newUser = { email, name, photoURL };
          const result = await usersCollection.insertOne(newUser);
          res.status(201).json({ success: true, userId: result.insertedId });
      } catch (error) {
          console.error('Error saving user:', error);
          res.status(500).json({ error: 'Internal server error.' });
      }
  });
  
  //url fetch for navbar
  app.get('/users/:email', async (req, res) => {
    const { email } = req.params.email;
    try {
      const user = await usersCollection.findOne({ email });
      if (user) {
        res.json(user);
      } else {
        res.status(404).send('User not found');
      }
    } catch (error) {
      res.status(500).send('Error fetching user data');
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
        //secure: false
        secure: process.env.NODE_ENV=== 'production',
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success: true});
    })


    app.post('/logout', (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        //secure: false
        secure: process.env.NODE_ENV=== 'production',
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({ success: true })
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
