require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const morgan = require('morgan')
const cors = require('cors')

const personModel = require('./models/person')

morgan.token('res-body', (req, res) => {
  const bodyString = JSON.stringify(req.body)
  if (bodyString === '{}') {
    // Returning space because otherwise morgan will return '-'
    return(' ')
  }
  return bodyString
})

app.use(express.static('build'))
app.use(bodyParser.json())
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :res-body'))
app.use(cors())

app.get('/api/persons', (req, res) => {
  personModel.find({}).then(persons => {
    res.json(persons.map(person => person.toJSON()))
  })
})

app.post('/api/persons', (req, res) => {

  const requestedPerson = req.body

  if (!requestedPerson.name || !requestedPerson.number){
    res.status(400).json({error: "Person's name or number is missing from request"})
  }

  personModel.exists({name: requestedPerson.name})
  .then(outcome => {
    if (outcome){
      res.status(409).json({error: `Person with name '${requestedPerson.name}' is already found from phonebook`})
    }
    else {
      const newPerson = new personModel({
        name: requestedPerson.name ,
        number: requestedPerson.number ,
      })
    
      newPerson.save().then(savedPerson => {
        res.json(savedPerson.toJSON())
      })
    }
  })
})

app.get('/api/persons/:id', (req, res, next) => {
  personModel.findById(req.params.id).then(person => {
    if (person){
      res.json(person.toJSON())
    }
    else {
      response.status(404).end()
    }
  })
  .catch(error => next(error))
})

app.put('/api/persons/:id', (req, res, next) => {
  const body = req.body

  const person = {
    name: body.name,
    number: body.number
  }

  personModel.findByIdAndUpdate(req.params.id, person, {new: true})
             .then( updatedPerson => {
               res.json(updatedPerson.toJSON())
             })
             .catch(error => next(error))
})

app.delete('/api/persons/:id', (req, res, next) => {
  console.log(req.params.id)
  personModel.findByIdAndRemove(req.params.id)
      .then(result => {
        res.status(204).end()
      })
      .catch(error => next(error))
})

const unknownEndpoint = (req, res) => {
  res.status(404).send({error: 'unknown endpoint'})
}

app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.error(error.message)

  if (error.name === 'CastError' && error.kind === 'ObjectId') {
    return response.status(400).send({ error: 'malformatted id' })
  } 

  next(error)
}

app.use(errorHandler)

const PORT = process.env.PORT

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})