IMPORTANT: Before launching the microservice responsible for the model, download the model from the [link](https://drive.google.com/file/d/1o-8-9i3Aa5lpI3hzjGHHf4MdHv2VBV_o/view?usp=sharing), and place it in the [config directory](https://github.com/Serfetto/techsquad/tree/main/backend/configs)

Open three new consoles and follow the commands:
1. In all consoles type: ```cd backend```
2. In all consoles type: ```python -m venv .venv```
3. In all consoles type: ```.venv/Scripts/activate```
4. In one console type: ```pip install -r configs/requirements.txt```
6. In the first console add this command -> ```python -m clientService.app``` -> and in the second console add this command -> ```python -m authService.app``` -> and in the third console add this command -> ```python -m modelService.app```
7. Open browser and type this urls: ```http://localhost:8001/docs```, ```http://localhost:8002/docs```, ```http://localhost:8003/docs```
