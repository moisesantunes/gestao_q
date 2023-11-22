const express= require("express")
const app = express()
const engine = require("ejs-mate")
///configuração do qrcode no terminal 
const { ip, ipv6, mac } = require('address');
const qrcode = require('qrcode-terminal');

const mongoose = require('mongoose');

const {Schema}= mongoose;

const session = require('express-session')
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

const produtoSchema= new Schema({
	nome: String,
	precoEntrada: Number,
	precoSaida: Number,
	fabricante:String,
	dataValidade:String,
	obs: String,
	vendido:{type:String, default:"nao"},
	desconto:{type:Number,default:0},
	precoFinal:{type:Number,default:0},
	idComprador:String
})
const Produto = mongoose.model("Produto",produtoSchema)

const clienteSchema = new Schema({
	nome:String,
	endereco:String,
	telefone1:String,
	telefone2:String,
	obs:String,
})
const Cliente = mongoose.model("Cliente", clienteSchema)

const vendaSchema = new Schema({
	dataVenda:String,
	nomeCliente:String,
	idCliente:String,
	idProduto:[{type: Schema.Types.ObjectId, ref:Produto}]
	
})
const Venda=mongoose.model("Venda",vendaSchema)


app.use(express.json())
app.use(express.urlencoded({ extended: true}))
mongoose.connect('mongodb://127.0.0.1:27017/gestao_q');
app.use(express.static('public'))



app.engine('ejs', engine);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs'); // so you can render('index')

app.use(function(req,res,next){
	if(!req.session.ultimo){
		req.session.ultimo={}
	}
	if(!req.session.carrinho){
		req.session.carrinho={}
		req.session.carrinho.nomeCliente = null
		req.session.carrinho.idCliente= null
		req.session.carrinho.produtos =[]
	}
	next()
})

app.get('/', async (req,res)=>{
  res.render('inicio', {
  	 titulo: 'Inicio',
  	   });
});
//rotas de produtos
/**
hierarquia dos produtos
produtos= produtosInicio.ejs
|-novo produto = novoProduto.ejs
	|-novo produto 
	|-repetir o anterior
	
|-todos os produtos =todosprodutos
	|-por ordem
		|-preco
		|-nome
		|-validade
	

*/

app.get("/produtos",(req,res)=>{
	res.render("produtosInicio",{
		titulo:"Produtos"
	})
})

app.get("/novoproduto", async (req,res)=>{
	res.render("novoProduto",{
		titulo:"Cadastro de produtos",
		ultimo:req.session.ultimo
	})	
})

app.get("/verproduto/:produto", async(req,res)=>{
	let produto= await Produto.findOne({_id:req.params.produto})
	res.render("umProduto",{
		titulo:`Vendo ${produto.nome} `,
		umProduto:produto
	})
})

app.get('/todosprodutos', async (req,res)=>{
	const prods = await  Produto.find() .sort({dataValidade:'asc'})
//	const prods = await Produto.find({_id:{$nin:req.session.carrinho.produtos}}).sort({dataValidade:'asc'})
  	res.render('produtos', {
  		titulo: 'Todos os Produtos',
  		produtos:prods,
  		carrinho:req.session.carrinho,
	});
});




app.get("/ultimoproduto", async (req,res)=>{
	res.render("ultimoProduto",{
		titulo:"Ultimo produto lançado",
		ultimo:req.session.ultimo
	})	
})

app.get("/editarproduto/:produto", async (req,res)=>{
 		const prod = await  Produto.findOne({_id:req.params.produto})
 		res.render("editarProduto",{
			titulo:"Edição de produtos",
			produto:prod
		})	
})
app.post("/editarproduto/:produto",async (req,res)=>{
	const prod = await Produto.findOneAndUpdate({_id:req.params.produto},req.body)
	res.redirect("/todosprodutos")

})

app.post("/cadprod/novo", async (req , res)=>{
	const prod = new Produto(req.body)
	const salvo = prod.save()
	req.session.ultimo= req.body
/*
	salvo.then((prod)=>{
	//	console.log('produto cadastrado: '+prod)
		req.session.ultimo.nome = req.body
	//	console.log("na sesao  "+req.session.ultimo)
	})
*/
	res.redirect("/novoproduto")
	
})




//rotas clientes
app.get("/clientes",async (req, res)=>{
	res.render("clientesInicio",{
		titulo:"Clientes Inicio",
		mensagem:""
	})
})

app.get("/novocliente", async (req,res)=>{
	res.render("novoCliente",{
		titulo:"Cadastro de Clientes",
	})	
})

app.get("/todosclientes",async (req,res)=>{
	let clientes = await Cliente.find()
	res.render("clientes",{
		titulo:"Todos Clientes",
		clientes:clientes,
		carrinho:req.session.carrinho
	})
	
})

app.get("/procurarcliente", async (req,res)=>{
	//console.log(req.query.nome)
	const  cliente =await Cliente.findOne({nome:{$regex:req.query.nome,$options:"i"}})
	console.log(cliente)
	if(cliente == null){
		res.render("clientesInicio",{
			titulo:"Clientes Inicio",
			mensagem:"Não há correspondente"	
		})
	}else{
		res.redirect("/vercliente/"+cliente._id)

	}
	

})

app.get("/vercliente/:cliente",async (req,res)=>{
 	const cliente = await  Cliente.findOne({_id:req.params.cliente})
	res.render("umCliente",{
		titulo: `Vendo cliente: ${cliente.nome}`,
		cliente:cliente,
		carrinho:req.session.carrinho
	})
	
})
 
app.get("/editarcliente/:cliente",async (req,res)=>{
 	const cliente = await  Cliente.findOne({_id:req.params.cliente})
	res.render("editarClientes",{
		titulo:"Editar Cliente",
		cliente:cliente
	})
	
})

app.post("/editarcliente/:cliente",async (req,res)=>{
	const cliente = await  Cliente.findOneAndUpdate({_id:req.params.cliente},req.body)
	res.redirect("/todosclientes")	
})

app.post("/novocliente", async (req,res)=>{
	let cliente = new Cliente(req.body)
	let novoCliente = await cliente.save() 
	res.redirect("/novocliente")
})








app.get("/vendas",async (req, res)=>{
	let vendas = await Venda.find({})
	res.render("vendas",{
	vendas:vendas,
	carrinho:req.session.carrinho,
	titulo:"Todas as Vendas"
	})
})

app.get("/detalhesvenda/:venda", async (req,res)=>{
	let venda  = await Venda.findOne({_id:req.params.venda}).populate("idProduto")
	res.render("detalhesVenda",{
		titulo: "Venda Detalhada",
		venda:venda
	})	
})



app.get("/venda/:cliente",async (req,res)=>{
	let cliente = await  Cliente.findOne({_id:req.params.cliente})	
	let carrinho = req.session.carrinho;
 	carrinho.nomeCliente= cliente.nome;
	carrinho.idCliente= cliente._id;
	carrinho.produtos =[]
	res.redirect("/carrinho")
/*	
 	res.render("carrinho",{
		titulo:`Carrinho: ${req.session.carrinho.nomeCliente}`,
		carrinho:req.session.carrinho,	
	})
*/

})

app.get("/carrinho", async (req,res)=>{
	if(req.session.carrinho.nomeCliente){

		const produtos = await Produto.find({ _id:{$in:req.session.carrinho.produtos}}).sort({precoSaida:'asc'})
		let total = produtos.reduce((total, num)=>{
			return total +num.precoSaida
		},0)
		
//console.log(total)
//console.log(req.session.carrinho)
//console.log(produtos)

		res.render("carrinho",{
		titulo:`Carrinho: ${req.session.carrinho.nomeCliente}`,
		carrinho:req.session.carrinho,
		produtos:produtos,	
	})

}else{
	res.redirect("/")
}
})

app.post("/adicionar/:produto",async (req,res)=>{
 //	const produto = await  Produto.findOne({_id:req.params.produto})
/*
	let prodObj={}
	prodObj.nome=req.body.nome;
	prodObj.precoSaida=req.body.precoSaida;
	prodObj.id=req.params.produto;
*/	
	if(req.session.carrinho.produtos){
		req.session.carrinho.produtos.push(req.params.produto)
	}
 	res.redirect("/todosprodutos")
})


app.all("/tirardocarrinho/:produto", async (req,res)=>{
	let restante = req.session.carrinho.produtos.filter((item)=>{
		return item != req.params.produto
	})
	req.session.carrinho.produtos =restante 
	 if(req.method == "GET"){res.redirect("/carrinho")}
//  	res.redirect("/carrinho")
 	if(req.method =="POST"){res.redirect("/todosprodutos")}

})




app.post("/finalizarvenda/:cliente?",async (req,res)=>{
	
	const venda= new Venda(req.body)
	const vendido = await venda.save()
	console.log("venda feita: ", vendido)


	//1- procuro na base os produtos que estao no carrinho 
	const produtos = await Produto.find({_id:{$in:req.session.carrinho.produtos}})
	//2- percorro a lista de produtos no carrinho para encontrar sua possicao no body
//tipo uma tabela: listas como linhas , ids como ref de colunas
console.log("carrinho finalizado: ",req.body)
	produtos.forEach(async (item, index)=>{
		let i = req.body.idProduto.indexOf(item._id.toString())
//console.log("o prod da ves e ",item._id.toString())
//console.log("os produtos na query : ",produtos)
//console.log(" no body é ", i)
//console.log("o body ta assim: ", req.body.idProduto)
//console.log("e no carrinho ele é: ", req.session.carrinho.produtos.indexOf(item._id.toString()))
//console.log(" o carrinho = ", req.session.carrinho)
//console.log("o valor de ", item.nome," com o id- ", item._id , "era: ",item.precoSaida)
//console.log("com o desconto de: ", req.body.desconto[i],"%")
//console.log("o preco final fica: ", req.body.precoFinal[i])
//	console.log(Array.isArray(req.body.idProduto))
	if(Array.isArray(req.body.idProduto)){
		let prod=await Produto.findOneAndUpdate({_id:item._id},
			{
				vendido:"sim",
				desconto:req.body.desconto[i],
				precoFinal:req.body.precoFinal[i]
			})		
	}else{
		let prod=await Produto.findOneAndUpdate({_id:item._id},
			{
				vendido:"sim",
				desconto:req.body.desconto,
				precoFinal:req.body.precoFinal
			})				
		}			
	})
	res.redirect("/vendas")	


})



/**
carrinho
1-tem que permitir ver o nome de quem esta 
sendo atendido no momento
2- tem que permitir ver os produtos que o cliente pensa comprar
3- pode receber 1 a n produtos
4-deve ser volatil, funcionar de acordo com o atendimento do cliente.No momento so um por vez
5-quando finalizar o atendimento ele deve: permirtir salvar o registro da venda ou desistir e esvaziar o carrinho.
*/

/**
Venda:
1 nome do cliente
2 id do cliente
3 data da venda
5 total da venda levaando em conta desconto
atyalizar informação do produto por:
6 dar desconto atyalizar
7 atribuir valor apos dar dezconto atualizar


*/
app.get("/salvar",async (req,res)=>{
	const prod = new Produto(produto)
	const salvo =prod.save()
	res.redirect("/")
})

app.get("/apagar",async (req,res)=>{
	await Produto.deleteMany({})
	res.redirect("/")
})

/*
app.get('/', (req, res) => {
  res.send('Hello World!')
})
*/

qrcode.generate('http://'+ip()+":8080", function (qrcode) {
    console.log(qrcode);
});
app.listen(8080, () => {
  console.log(`Example app listening on port 3000`)
})
