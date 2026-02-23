const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcryptjs')
const app = require('../app')
const api = supertest(app)
const helper = require('./test_helper')
const Blog = require('../models/blog')
const User = require('../models/user')

describe('deletion of a blog', () => {
  let token = null
  let mainUser = null

  beforeEach(async () => {
    // 1. Clear database completely
    await Blog.deleteMany({})
    await User.deleteMany({})

    // 2. Create the creator user
    const passwordHash = await bcrypt.hash('secret', 10)
    mainUser = new User({ username: 'root', passwordHash })
    await mainUser.save()

    // 3. Get token
    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'root', password: 'secret' })

    token = loginResponse.body.token

    // 4. Create an initial blog linked to the creator
    const blogObject = new Blog({
      title: 'First Blog',
      author: 'Author 1',
      url: 'http://url1.com',
      likes: 1,
      user: mainUser._id
    })
    await blogObject.save()
  })

  test('succeeds with status code 204 if id is valid', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)

    const titles = blogsAtEnd.map(r => r.title)
    assert(!titles.includes(blogToDelete.title))
  })

  test('fails with status code 404 if blog does not exist', async () => {
    const validNonExistingId = await helper.nonExistingId()

    await api
      .delete(`/api/blogs/${validNonExistingId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })

  test('fails with status code 401 if token is missing', async () => {
    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    // Verify length remains 1
    assert.strictEqual(blogsAtEnd.length, 1)
  })

  test('fails with status code 401 if user is not the creator', async () => {
    // Create another user to attempt the deletion
    const passwordHash = await bcrypt.hash('otherpassword', 10)
    const otherUser = new User({ username: 'other', passwordHash })
    await otherUser.save()

    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'other', password: 'otherpassword' })

    const otherToken = loginResponse.body.token

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    // Ensure blog exists before proceeding
    assert.ok(blogToDelete, 'Blog should exist in database')

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(401)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
  })

  test('succeeds with status code 204 if user is admin', async () => {
    const passwordHash = await bcrypt.hash('adminpassword', 10)
    const adminUser = new User({ username: 'admin', role: 'admin', passwordHash })
    await adminUser.save()

    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'admin', password: 'adminpassword' })

    const adminToken = loginResponse.body.token

    const blogsAtStart = await helper.blogsInDb()
    const blogToDelete = blogsAtStart[0]

    assert.ok(blogToDelete, 'Blog should exist in database for admin test')

    await api
      .delete(`/api/blogs/${blogToDelete.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204)

    const blogsAtEnd = await helper.blogsInDb()
    assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)
  })
})

after(async () => {
  await mongoose.connection.close()
})