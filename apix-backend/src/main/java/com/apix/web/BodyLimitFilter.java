package com.apix.web;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import java.io.*;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class BodyLimitFilter extends OncePerRequestFilter {
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
        if (!req.getMethod().equals("POST")) {
            chain.doFilter(req, res);
            return;
        }
        byte[] bytes = req.getInputStream().readNBytes(8 * 1024 * 1024 + 1);
        if (bytes.length > 8 * 1024 * 1024) {
            res.sendError(413, "Request exceeds 8 MiB");
            return;
        }
        chain.doFilter(new HttpServletRequestWrapper(req) {
            public ServletInputStream getInputStream() {
                var in = new ByteArrayInputStream(bytes);
                return new ServletInputStream() {
                    public int read() {
                        return in.read();
                    }

                    public boolean isFinished() {
                        return in.available() == 0;
                    }

                    public boolean isReady() {
                        return true;
                    }

                    public void setReadListener(ReadListener l) {
                        throw new UnsupportedOperationException();
                    }
                };
            }

            public BufferedReader getReader() {
                return new BufferedReader(new InputStreamReader(getInputStream(), java.nio.charset.StandardCharsets.UTF_8));
            }
        }, res);
    }
}
