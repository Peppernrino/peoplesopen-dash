#!sh
ip route
printf "\n --- \n\n"
iw dev phy0 station dump
printf "\n --- \n\n"
arp -i eth0 -n
printf "\n --- \n\n"
# swconfig dev eth0 list
# printf "\n --- \n\n"
ip addr