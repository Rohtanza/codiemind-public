import axios from "axios";
const fetch = (u: string) => axios.get(u);
fetch("/a");
