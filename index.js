const express = require("express");
const { Client } = require("pg");
const cors = require("cors");
const bodyparser = require("body-parser");
const config = require("./config");

const app = express();

app.use(express.json());//na saida 
app.use(cors());
app.use(bodyparser.json());//na entrada 

var conString = config.urlConnection;

var client = new Client(conString);

client.connect((err) => {
  if (err) {
    return console.error('Não foi possível conectar ao banco.', err);
  }
  client.query('SELECT NOW()', (err, result) => {
    if (err) {
      return console.error('Erro ao executar a query.', err);
    }
    console.log(result.rows[0]);
  });
});

app.get("/", (req, res) => {
  console.log("Response ok.");//vai para powershell
  res.send("Ok – Servidor disponível.");//vai p browser
});

app.get("/usuarios", (req, res) => {
  try {
    client.query("SELECT * FROM Usuarios", function (err, result) {
      if (err) {
        return console.error("Erro ao executar a qry de SELECT", err);
      }
      res.send(result.rows);
      console.log("Rota: get usuarios");
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/usuarios/:id", (req, res) => {
  try {
    console.log("Rota: usuarios/" + req.params.id);
    client.query(
      "SELECT * FROM Usuarios WHERE id = $1", [req.params.id],
      (err, result) => {
        if (err) {
          return console.error("Erro ao executar a qry de SELECT id", err);
        }
        res.send(result.rows);
        //console.log(result);
      }
    );
  } catch (error) {
    console.log(error);
  }
});

app.delete("/usuarios/:id", (req, res) => {
  try {
    console.log("Rota: delete/" + req.params.id);
    client.query(
      "DELETE FROM Usuarios WHERE id = $1", [req.params.id], (err, result) => {
        if (err) {
          return console.error("Erro ao executar a qry de DELETE", err);
        } else {
          if (result.rowCount == 0) {
            res.status(404).json({ info: "Registro não encontrado." });
          } else {
            res.status(200).json({ info: `Registro excluído. Código: ${req.params.id}` });
          }
        }
        console.log(result);
      }
    );
  } catch (error) {
    console.log(error);
  }
});
app.get("/users/", (req, res) => {
  try {
    client.query("SELECT * FROM users", function
      (err, result) {
      if (err) {
        return console.error("Erro ao executar a qry de SELECT", err);
      }
      res.send(result.rows);
      console.log("Rota: get usuarios");
    });
  } catch (error) {
    console.log(error);
  }
});

app.post("/users", (req, res) => {
  try {
    console.log("Alguém enviou um post com os dados:", req.body);

    // Adicionando logs adicionais
    console.log("Email recebido:", req.body.email);
    console.log("Password recebido:", req.body.password);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e password são obrigatórios." });
    }

    client.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *", 
      [email, password],
      (err, result) => {
        if (err) {
          console.error("Erro ao executar a query de INSERT:", err.message);
          console.error("Detalhes do erro:", err);
          return res.status(500).json({ error: "Erro ao inserir dados no banco de dados.", details: err.message });
        }
        const { id } = result.rows[0];
        res.setHeader("id", `${id}`);
        res.status(201).json(result.rows[0]);
        console.log(result);
      }
    );
  } catch (erro) {
    console.error("Erro no servidor:", erro.message);
    res.status(500).json({ error: "Erro interno do servidor.", details: erro.message });
  }
});


app.post("/usuarios", (req, res) => {
  try {
    console.log("Alguém enviou um post com os dados:", req.body);
    const { nome, email, altura, peso } = req.body;
    client.query(
      "INSERT INTO Usuarios (nome, email, altura, peso) VALUES ($1, $2, $3, $4) RETURNING * ", [nome, email, altura, peso],
      (err, result) => {
        if (err) {
          return console.error("Erro ao executar a qry de INSERT", err);
        }
        const { id } = result.rows[0];
        res.setHeader("id", `${id}`);
        res.status(201).json(result.rows[0]);
        console.log(result);
      }
    );
  } catch (erro) {
    console.error(erro);
  }
});

app.get("/users/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Erro ao executar a query de SELECT", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota de login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Recebido login:", { email, password });

    const result = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      console.log("Usuário não encontrado.");
      return res.status(400).json({ error: "Usuário não encontrado." });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log("Senha incorreta.");
      return res.status(400).json({ error: "Senha incorreta." });
    }

    console.log("Login bem-sucedido:", { id: user.id, email: user.email });
    res.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

app.put("/usuarios/:id", (req, res) => {
  try {
    console.log("Alguém enviou um update com os dados:", req.body);
    const id = req.params.id;
    const { nome, email, altura, peso } = req.body;
    client.query(
      "UPDATE Usuarios SET nome=$1, email=$2, altura=$3, peso=$4 WHERE id =$5 ",
      [nome, email, altura, peso, id],
      (err, result) => {
        if (err) {
          return console.error("Erro ao executar a qry de UPDATE", err);
        } else {
          res.setHeader("id", id);
          res.status(202).json({ "identificador": id });
          console.log(result);
        }
      }
    );
  } catch (erro) {
    console.error(erro);
  }
});


app.listen(config.port, () =>
  console.log("Servidor funcionando na porta " + config.port)
);

module.exports = app; 
