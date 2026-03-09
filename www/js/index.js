let ProductListInstance = null
let ProductModalInstance = null
let WorkshopModalInstance = null
let CalcModalInstance = null

async function fetch_with_body(route, method, dict){
    const response = await fetch(route, 
        {
        method: method,
        headers: {
        'Content-Type': 'application/json',
        },
        body:JSON.stringify(dict)
    })

    return response
}

async function parse_data(response) {
    const data = await response.json()

    return JSON.parse(data)
}

function log_route_error(route, method) {
    console.error(`Не удалось обратится к ${route}. Метод ${method}`)
}

async function get(route){
    const method = "GET"
    const response = await fetch(route, {
        method:method
    })

    if(response.ok){
        return await parse_data(response)
    }

    log_route_error(route, method)
}

async function send_to_server(route, dict, method = "POST"){
    console.log(dict)
    const response = await fetch_with_body(route, method, dict)

    if(response.ok){
        return await parse_data(response)
    }

    console.log(response)
    log_route_error(route, method)
}

class ProductList{
    constructor(containerId){
        this.initialized = false
        this.container = document.getElementById(containerId);
        this.addBtn = document.getElementById("openAddProductModal")

        this.addBtn.onclick = () => {
            ProductModalInstance.init(null)
            ProductModalInstance.open()
        }
    }

    async init(){
        this.products = await this.getProducts()
        this.initialized = true
    }

    render(){
        if(!this.initialized){
            console.warn("ProductList еще не инициализирован")
            return
        }

        function div_text_icon(text, iconName){
            const div = document.createElement("div")
            div.style = "display: flex; gap: 10px; padding-top:10px"

            const textContent = document.createElement("span")
            textContent.innerText = text

            const icon = document.createElement("span")
            icon.className = "material-symbols-outlined"
            icon.textContent = iconName

            div.append(textContent)
            div.append(icon)

            return div
        }

        this.container.innerHTML = ""

        this.products.sort((a,b) => a.id-b.id).forEach(product => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'product-item';

            const dataDiv = document.createElement("div")

            const productName = document.createElement("span")
            productName.className = "product-name"
            productName.innerText = `${product.production_type.type} | ${product.name}`

            dataDiv.appendChild(productName)
            dataDiv.appendChild(div_text_icon(product.article, "art_track"))
            dataDiv.appendChild(div_text_icon(product.min_price, "attach_money"))
            dataDiv.appendChild(div_text_icon(product.material_type.type, "tonality"))

            const btnsDiv = document.createElement("div")
            btnsDiv.style = "display:flex;gap:20px"

            const viewBtn = document.createElement("span")
            viewBtn.className = "material-symbols-outlined"
            viewBtn.textContent = "remove_red_eye"
            viewBtn.setAttribute("productId", product.id)

            viewBtn.onclick = (e) => {
                e.stopPropagation();
                const id = viewBtn.getAttribute('productId');
                const product = this.products.find(p => p.id == id);
                if (product){
                    ProductModalInstance.init(product)
                    ProductModalInstance.open();
                }
            }

            const deleteBtn = document.createElement("span")
            deleteBtn.className = "material-symbols-outlined"
            deleteBtn.textContent = "delete"
            deleteBtn.setAttribute("productId", product.id)
            deleteBtn.style.color = "#f19d9d"

            deleteBtn.onclick = async (e) => {
                e.stopPropagation();

                if(!confirm("Вы уверены, что хотите удалить продукт? Отменить это действие будет невозможно")){
                    return
                }

                const id = parseInt(deleteBtn.getAttribute('productId'));
                
                const response = await fetch(`/products/${id}`, {
                    method: "DELETE",
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if(response.ok){
                    await ProductListInstance.init();
                    ProductListInstance.render();
                }
            }

            const calcBtn = document.createElement("span")
            calcBtn.className = "material-symbols-outlined"
            calcBtn.textContent = "developer_board"
            calcBtn.setAttribute("productId", product.id)
            calcBtn.onclick = (e) => {
                e.stopPropagation();
                const id = calcBtn.getAttribute('productId');
                const product = this.products.find(p => p.id == id);

                CalcModalInstance.init(product.production_type, product.material_type)
                CalcModalInstance.open()
            }

            btnsDiv.appendChild(viewBtn)
            btnsDiv.append(calcBtn)
            btnsDiv.append(deleteBtn)

            const left = document.createElement("div")
            left.id = "left"
            left.style = "display:flex; flex-direction:column; justify-content:space-between;height: -webkit-fill-available;"

            let productionTime = 0

            for(const ws of product.workshops){
                productionTime+=ws.time
            }

            const roundedTime = Math.round(productionTime)
            const time = document.createElement("span")
            time.innerText = `${roundedTime!=productionTime ? `≈ ${roundedTime}` : productionTime} ч.`
            time.style.fontSize = "25px"
            time.style.textAlign = "center"

            left.appendChild(time)
            left.appendChild(btnsDiv)

            itemDiv.appendChild(dataDiv)
            itemDiv.appendChild(left)

            this.container.appendChild(itemDiv);
        })
    }

    async getProducts(){
        return await get("/products")
    }
}

class ProductModal{
    constructor(){
        this.saveBtn = document.getElementById('saveProductBtn')
        this.nameInput = document.getElementById('productNameInput')
        this.overlay = document.getElementById('productModal')
        this.workshopsContainer = document.getElementById('workshopTagsContainer');
        this.addWorkshopBtn = document.getElementById("openAddWorkshopBtn")
        this.articleInput = document.getElementById("productArticleInput")
        this.priceInput = document.getElementById("productPriceInput")
        this.productType = document.getElementById("productTypeSelect")
        this.materialType = document.getElementById("productMaterialSelect")
        this.initialized = false
    }

    async initAsyncResources(){
        this.product_types = await get("/product_types")
        this.material_types = await get("/material_types")
    }

    init(product){
        this.newProduct = product==null

        function set_value_and_action_input(input, text, self){
            input.oninput = self.newProduct? ()=>{self.validate()} : () => {self.checkChanges(self.product)}
            input.value = text
        }

        function generate_select_list(select, options, selectedValue, self){
            select.innerHTML = ""
            options.forEach(op=>{
                const option = document.createElement("option")
                option.value = op.value
                option.textContent = op.text

                if(selectedValue&&selectedValue==option.value){
                    option.selected = true
                }

                select.appendChild(option)
                select.oninput = self.newProduct? null : () => {self.checkChanges(self.product)}
            })
        }

        this.product = product
        this.changed = this.newProduct

        this.workshops = this.newProduct? [] : product.workshops.slice()
        
        set_value_and_action_input(this.nameInput, this.newProduct? "" : product.name, this)
        set_value_and_action_input(this.articleInput, this.newProduct? "" : product.article, this)
        set_value_and_action_input(this.priceInput, this.newProduct? "0" : product.min_price, this)
        
        generate_select_list(this.productType, this.product_types.map(p=>{return {value:p.id, text:p.type}}), this.newProduct ? null : product.production_type.id, this)
        generate_select_list(this.materialType, this.material_types.map(p=>{return {value:p.id, text:p.type}}), this.newProduct ? null : product.material_type.id, this)

        this.saveBtn.innerText = this.newProduct? 'Сохранить' : "Ок"

        this.overlay.onclick = (e) => {
            if(e.target==this.overlay){
                this.close()
            }
        }

        this.addWorkshopBtn.onclick = async () => {
            await WorkshopModalInstance.init(this.workshops)
            WorkshopModalInstance.open()
        }

        this.initialized = true

        this.renderWorkshops()
        this.validate()
    }

    renderWorkshops(){
        if(!this.newProduct) this.checkChanges()

        this.workshopsContainer.innerHTML = '';
        if (!this.workshops || this.workshops.length === 0) {
            this.workshopsContainer.innerHTML = '<span class="placeholder-text">нет привязанных цехов</span>';
            return;
        }

        this.workshops.forEach(ws => {
            const tag = document.createElement('span');
            tag.className = 'workshop-tag';
            tag.innerText = ws.data.name

            const removeBtn = document.createElement("span")
            removeBtn.className = "material-symbols-outlined"
            removeBtn.textContent = "delete"
            removeBtn.style = "cursor:pointer"
            removeBtn.setAttribute("wsId", ws.data.id)
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.workshops = this.workshops.filter(s=>s.data.id!=removeBtn.getAttribute("wsId"))
                this.renderWorkshops()
            }

            const stuffCount = document.createElement("span")
            stuffCount.textContent = `Работников: ${ws.data.stuff_count}`

            const time = document.createElement("span")
            time.textContent = `Время в цехе: ${ws.time} ч.`
            
            tag.appendChild(removeBtn)
            tag.appendChild(stuffCount)
            tag.appendChild(time)

            this.workshopsContainer.appendChild(tag);
        });
    }

    open(){
        if(!this.initialized){
            console.warn("ProductModal еще не инициализирован")
            return
        }

        this.overlay.classList.add("active")
    }

    validate(){
        const isName = this.validateEmptiness(this.nameInput, this.nameInput.labels[0])
        const isArticle = this.validateEmptiness(this.articleInput, this.articleInput.labels[0])
        const isPrice = this.validateEmptiness(this.priceInput, this.priceInput.labels[0])
        const pricePositive = this.validateNumberPositiveness(this.priceInput, this.priceInput.labels[1])

        if(isName&&isPrice&&isArticle&&pricePositive){
            this.saveBtn.classList.add("active")
            this.saveBtn.onclick = async () => {await this.claimChanges()}
        }
        else{
            this.saveBtn.classList.remove("active")
            this.saveBtn.onclick = null
        }
    }

    validateEmptiness(input, errorLabel){
        if(!input.value||input.value.trim().length==0){
            errorLabel.style.display = "block"
            return false
        }
        else{
            errorLabel.style.display = "none"
            return true
        }
    }

    validateNumberPositiveness(input, errorLabel){
        console.log(parseInt(input.value))
        if(parseInt(input.value)<0){
            errorLabel.style.display = "block"
            return false
        }
        else{
            errorLabel.style.display = "none"
            return true
        }
    }

    checkChanges(){
        if(this.newProduct) return true

        function haveSameElements(a, b) {
            if (a.length !== b.length) return false;
            
            const sortedA = [...a].sort((a, b) => 
                a.data.name.localeCompare(b.data.name));
            
            const sortedB = [...b].sort((a, b) => 
                a.data.name.localeCompare(b.data.name)
            );
            
            return sortedA.every((value, index) => value.data.name == sortedB[index].data.name && value.id==sortedB[index].id && value.time == sortedB[index].time);
        }

        const sameName = this.product.name.trim() == this.nameInput.value.trim()
        const sameArticle = this.product.article.trim() == this.articleInput.value.trim()
        const samePrice = parseInt(this.product.min_price) == parseInt(this.priceInput.value)
        const sameType = this.product.production_type.id == this.productType.value
        const sameMaterialType = this.product.material_type.id == this.materialType.value

        if(!sameName || !sameArticle || !samePrice || !sameType || !sameMaterialType || !haveSameElements(this.product.workshops, this.workshops)){
            this.saveBtn.innerText = "Сохранить"
            this.changed = true

            this.validate()
        }
        else{
            this.saveBtn.innerText = "Ок"
            this.changed = false
        }
    }

    async claimChanges(){
        if(this.changed){
            const prod_name = this.nameInput.value.trim()
            const workshops = this.workshops? this.workshops.map(s=>{
                return {"id":s.data.id, time:s.time}
            }) : []
            const article = this.articleInput.value.trim()
            const price = parseInt(this.priceInput.value)
            const type = parseInt(this.productType.value)
            const materialType = parseInt(this.materialType.value)

            let productData = {
                name:prod_name,
                workshops:workshops,
                production_type:type,
                material_type:materialType,
                min_price:price,
                article:article
            }
            
            const dict = {"product":productData}

            if(!this.newProduct){
                productData["id"] = this.product.id
                await send_to_server("/products", productData, "PATCH")
            }
            else{
                await send_to_server("/products", productData)
            }

            
            this.changed = false
            await ProductListInstance.init()
            ProductListInstance.render()
            this.close()
        }
        else{
            this.close()
        }
    }

    close(){
        if(this.changed){
            const choice = confirm("У вас есть не сохраненные изменения для этого продукта. Все равно выйти?")

            if(!choice){
                return
            }
        }

        this.overlay.classList.remove("active")
    }
}

class WorkshopsModal{
    constructor(){
        this.overlay = document.getElementById("addWorkshopModal")
        this.selectedWorkshop = null
        this.select = document.getElementById('workshopSelect');
        this.initialized = false
        this.cancelBtn = document.getElementById("cancelWorkshopBtn")
        this.saveBtn = document.getElementById("addWorkshopConfirmBtn")
        this.timeInput = document.getElementById("wsTimeInput")

        this.overlay.onclick = (e) => {
            if(e.target==this.overlay){
                this.close()
            }
        }

        this.cancelBtn.onclick = () => {this.close()}
        this.saveBtn.onclick = () => {this.save()}
    }

    async init(currentWorkshops){
        this.currentWorkshops = currentWorkshops

        const allWorkshops = await this.getWorkshops()
        this.available = allWorkshops.filter(s=>!this.currentWorkshops.map(c=>c.data.id).includes(s.id))

        this.initialized = true
    }

    open(){
        if(!this.initialized ){
            console.warn("WorkshopsModal еще не инициализирован")
            return
        }

        this.overlay.classList.add("active")
        this.select.innerHTML = '';

        if (this.available.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.selected = true;
            option.textContent = '— все цеха уже добавлены —';
            this.select.appendChild(option);
        } 
        else {
            this.available.forEach(ws => {
                const option = document.createElement('option');
                option.value = ws.id;
                option.textContent = ws.name;
                this.select.appendChild(option);
            });
        }
    }

    close(){
        this.overlay.classList.remove("active")
    }

    async getWorkshops(){
        return await get("/workshops")
    }

    save(){
        const selected = this.select.value
        this.currentWorkshops.push({data:this.available.find(s=>s.id==selected), time:parseFloat(this.timeInput.value)})

        this.close()
        ProductModalInstance.renderWorkshops()
    }
}

class CalcModal{
    constructor(){
        this.paramsLabel = document.getElementById("calcParams")
        this.button = document.getElementById("calcButton")
        this.resultField = document.getElementById("calcResult")
        this.countInput = document.getElementById("calcCountInput")
        this.overlay = document.getElementById("calcModal")

        this.overlay.onclick = (e) => {if(e.target==this.overlay){this.close()}}
    }

    init(productType, materialType){
        this.countInput.value = "1"
        this.resultField.textContent = "Итого необходимо сырья:"

        this.paramsLabel.innerHTML = `Тип продукции: ${productType.type}. Коэффициент: ${productType.ratio}<br><br>Тип материала: ${materialType.type}. Процент потерь: ${materialType.loss_persent}`
        this.button.onclick = () => {this.calculate(productType.ratio, materialType.loss_persent)}
    }

    calculate(productRatio, loss){
        const count = parseInt(this.countInput.value)
        const materialCount = count*productRatio
        const materialLoss = materialCount*loss
        const totalMaterial = materialCount+materialLoss

        this.resultField.textContent = `Итого необходимо сырья: ${totalMaterial}`
    }

    open(){
        this.overlay.classList.add("active")
    }

    close(){
        this.overlay.classList.remove("active")
    }
}

async function initProductList() {
    ProductListInstance = new ProductList("productListContainer")
    await ProductListInstance.init()
    ProductListInstance.render()

    ProductModalInstance = new ProductModal()
    await ProductModalInstance.initAsyncResources()

    WorkshopModalInstance = new WorkshopsModal()
    CalcModalInstance = new CalcModal()
}