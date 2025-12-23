---
title: "HTTPS Does Not Mean Safe"
description: "Expore what HTTPS secures, what it does not solve, and how to fill in the gaps."
pubDate: 2024-01-03
draft: false
hero: "/me-small.png"
---


Growing up, everyone always told me “look for the green lock symbol in the URL bar, and you’ll be safe.” It was repeated in school, it was repeated at home, it was even repeated by friends’ parents. But is that still true, and in reality, was it even true back then? In online security, HTTPS is a critical part of internet safety, and pages that don’t deploy it should be avoided as a result of that. But what does it even mean, and stand for, and what role does it play in your safety on the web?

## What is HTTPS?

HyperText Transfer Protocol Secure (HTTPS) is the secure version of HTTP, the primary protocol used to send data between your web browser and the websites you visit. HTTPS encrypts all data sent between your browser and the receiving server, ensuring that the data transferred remains confidential.

HTTPS plays a vital role in safeguarding your browsing on the web. By ensuring end-to-end encryption between you and the receiving server, it prevents unauthorized access and eavesdropping, and prevents man-in-the-middle attacks. This encryption is crucial, especially when transmitting sensitive data like login credentials, credit card information, or personal details.

## Man-in-the-Middle Attacks

What are man-in-the-middle (MITM) attacks, you might ask? MITM occurs when attackers intercept and potentially alter the communication between two parties, usually your browser and the receiving backend. With HTTPS you mitigate this attack vector, as all data is being encrypted with the public key of an SSL certificate, making data unreadable without the private key which (hopefully) only the receiving server has ahold of. If the attacker somehow has access to this key, there is a whole different array of problems to consider, but that isn't relevant to this post.

## What HTTPS Doesn’t Guard Against

While HTTPS is effective in securing data transmission, it’s not a “catch all” for all cyber threats. More specifically, it can’t safeguard against more “mundane” attacks like domain spoofing and phishing, where attackers create websites with URLs similar to legitimate sites to trick users into providing their sensitive information.

Back in the day, when the internet and HTTPS was first conceived, the whole rule of looking for HTTPS was something you usually could adhere to, but only due to the cost of setting up SSL certificates. With the internet being a web of trust in terms of HTTPS, we can rely on certificates to be genuine. So, back in the day, with everything having a steep pricing in terms of SSL certificates, the “look for the lock symbol” was valid. But then came self-issued certificates through providers like Let's Encrypt.

With Let’s Encrypt, all you need is a domain and access to a terminal. With those two tools, anyone can create certificates for domains, subdomains, and wildcard domains. But what does this that mean for online safety? Well, for one, looking for the lock symbol isn't viable, just due to anyone being able to create certificates for their websites. As long as you have the money to buy domains like `securemicrosoft.com`, you can just as easily add HTTPS. The web of trust that is the internet once tried to solve this through with something called Extended Validation certificates, but that didn’t last long.

## Extended Validation Certificates

Extended Validation (EV) certificates provide a higher level of security assurance for websites. They require more rigorous verification of the legitimacy of the business requesting the certificate, offering greater trust to users. These certifications are expensive, at least compared to the zero cost that comes with normal SSL certificates. So why don't big companies like Microsoft use EV certificates for that added layer of security?

Despite their benefits, EV certificates have seen a decline in popularity. This is probably due to the lack of distinct, user-recognizable benefits in most web browsers, leading organizations to question their value compared to standard SSL certificates. Browsers don’t care about EV certificates anymore, their special treatment of cool, <a href="https://www.troyhunt.com/extended-validation-certificates-are-really-really-dead/" target="_blank">brand-in-url-bar-green-lock are gone from all major browsers</a>.

## Staying Safe, Online and Beyond

So how do you stay safe on the web with all these edge cases? Well, for one you should still always look for that lock symbol in the address bar paired with HTTPS. However your best tool for staying safe is common sense.

1\. Does the domain look “phishy” to you?

2\. Does the website use big brand name as subdomain, trying to camoflauge their real domain behind an industry leader?

3\. Is the page filled with grammatical errors and typos?

If any of these boxes gets ticked when looking at a website, it is either a scam, or they do something phishy either way and it is better to avoid using the site altogether. Unfortunately, this means that there is no clear rule. You need to use good judgment to spot elements of a page that appear out of place. That requires practice, which is really why we built Pistachio. We want to help people spot the clues that something is wrong in a safe environment where the worse that can happen is you'll get embarrassed by falling for one of our simulations.